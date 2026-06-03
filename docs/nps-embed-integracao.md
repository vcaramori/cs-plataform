# Integração do NPS embutido (embed.js) — Guia para Produto/Engenharia Plannera

> Público-alvo: time de Produto e Engenharia das **ferramentas Plannera** que vão
> hospedar a pesquisa de NPS. Este documento descreve **o que** colar, **onde**,
> e **quais dados** enviar. Não é necessário conhecer o backend do CS para integrar.

---

## 1. O que é

Um **script único** (`embed.js`) que, quando carregado dentro de uma ferramenta
Plannera, decide automaticamente se deve exibir a pesquisa de satisfação (NPS)
para aquele usuário e renderiza um painel lateral. Toda a lógica de **quando
mostrar**, **o que perguntar** e **gravação das respostas** fica no lado do CS
(plataforma `cs-plataform`). A ferramenta Plannera só precisa **carregar o script
informando dois dados: a instância e o e-mail do usuário logado.**

---

## 2. Snippet a ser implementado

Cole o bloco abaixo nas páginas da aplicação onde o NPS pode aparecer (idealmente
em um layout/base compartilhado, carregado após o login):

```html
<script src="https://cs-plataform.vercel.app/embed.js"
  data-program-key="dda223f802399ed7e444dea6e2d797dc"
  data-instance="INSTANCIA_DO_CLIENTE"
  data-email="EMAIL_DO_USUARIO"
  data-base-url="https://cs-plataform.vercel.app">
</script>
```

> ⚠️ Os valores `INSTANCIA_DO_CLIENTE` e `EMAIL_DO_USUARIO` devem ser
> **substituídos dinamicamente** pela aplicação, com os dados do usuário logado.
> Não deixe os placeholders literais.

### 2.1 Atributos

| Atributo | Obrigatório | O que enviar | Exemplo |
|---|:---:|---|---|
| `data-program-key` | ✅ | Identificador da pesquisa. **Fixo** — fornecido pelo time de CS. | `dda223f802399ed7e444dea6e2d797dc` |
| `data-instance` | ✅ | **A instância (URL) do cliente** — o endereço do sistema daquele cliente. É o que liga a resposta à conta. | `https://cliente.plannera.com.br` |
| `data-email` | ✅ | **E-mail de login** do usuário nas ferramentas Plannera. | `joao@cliente.com` |
| `data-base-url` | ✅ | Endereço da API do CS. **Fixo.** | `https://cs-plataform.vercel.app` |
| `data-force` | ❌ | `"true"` força exibir ignorando travas (apenas para testes). Não usar em produção. | `true` |

> **São apenas 2 dados dinâmicos: `data-instance` e `data-email`.** Os demais são fixos.

---

## 3. De onde vêm os dados

### `data-instance` — a instância do cliente
É a **URL/endereço da instância** do cliente — a mesma que o time de CS cadastra
no contrato (campo "Instância (URL)" em Gestão Comercial). A aplicação Plannera
já conhece em qual instância o usuário está; basta injetar esse valor.

- Um mesmo cliente pode ter **várias instâncias** (vários endereços/contratos).
  Cada instância envia o seu próprio `data-instance`; o CS agrega os resultados
  por cliente automaticamente.
- O valor é tolerante a variações: `http`/`https`, `www.`, barra final e
  maiúsculas/minúsculas são normalizados. Ainda assim, recomendamos enviar a URL
  **exatamente como cadastrada no contrato** para evitar ambiguidade.

### `data-email` — o usuário
É o **e-mail de login** do usuário na ferramenta Plannera. Serve para controlar a
recorrência (não incomodar a mesma pessoa repetidamente).

> ❌ **`user_id` foi descontinuado.** Versões antigas do snippet usavam
> `data-user-id`; ele não é mais necessário. O script ainda aceita `data-user-id`
> como _fallback_ para a instância apenas por compatibilidade, mas o correto é
> usar `data-instance`.

---

## 4. Comportamento (o que acontece ao carregar)

1. O script lê os atributos. Se faltar `program-key` ou `email`, ele não faz nada.
2. Chama `GET {base-url}/api/nps/check` enviando `program_key`, `email` e `instance`.
3. O CS decide **se deve exibir** com base em regras de negócio:
   - período de vigência da pesquisa;
   - recorrência por usuário (padrão: 90 dias após responder);
   - recorrência após descarte (padrão: 30 dias);
   - limite por conta/cliente (padrão: 30 dias).
4. Se **deve exibir**, renderiza um painel lateral com as perguntas configuradas.
5. Ao enviar, faz `POST {base-url}/api/nps/response` com a resposta + `instance`.
6. Há um atraso de ~1,5s após o carregamento da página antes de exibir, para não
   competir com o carregamento inicial da aplicação.

### Resposta sem instância cadastrada (órfã)
Se a instância enviada **ainda não estiver cadastrada** em nenhum contrato no CS,
a resposta **é gravada normalmente** (e aparece no NPS), apenas sem vínculo de
conta. Quando o contrato com aquela instância for cadastrado, as respostas
anteriores são **religadas retroativamente** à conta. Ou seja: a integração pode
ser publicada **antes** de todos os contratos estarem cadastrados, sem perda de
dados.

---

## 5. Privacidade e segurança

- O script **não** coleta dados além do que é passado nos atributos
  (`instance` e `email`) e das respostas que o próprio usuário digita.
- Não há cookies de rastreamento; o controle de "não exibir de novo" usa
  `localStorage` na origem da ferramenta Plannera.
- As chamadas vão para a API do CS via HTTPS, com CORS habilitado para uso
  cross-origin (o script roda no domínio da Plannera).
- Nenhuma credencial é enviada. `program-key` é um identificador público da
  pesquisa, não um segredo de autenticação.

---

## 6. Checklist de implementação (Produto/Eng Plannera)

- [ ] Incluir o `<script>` em um ponto carregado **após o login** (layout base).
- [ ] Injetar `data-instance` com a **URL da instância** do cliente atual.
- [ ] Injetar `data-email` com o **e-mail do usuário logado**.
- [ ] Manter `data-program-key` e `data-base-url` com os valores fixos fornecidos
      pelo CS.
- [ ] **Não** enviar `data-user-id` (descontinuado).
- [ ] Garantir que os valores sejam substituídos no servidor/render, não deixando
      placeholders literais.
- [ ] (Opcional) Em ambiente de homologação, validar visualmente o painel e o
      envio com `data-force="true"`.

---

## 7. Teste rápido

1. Carregar uma página com o snippet preenchido (instância + e-mail de teste).
2. Confirmar no DevTools → Network a chamada `…/api/nps/check?…&instance=…`
   retornando `200` com `should_show: true`.
3. Responder a pesquisa e confirmar `POST …/api/nps/response` retornando `201`.
4. O time de CS confirma a resposta no dashboard de NPS.

---

## 8. Contato

Dúvidas de integração, valor do `program-key`/`base-url` por ambiente, ou
cadastro de instâncias nos contratos: falar com o time de **Customer Success
(plataforma cs-plataform)**.
