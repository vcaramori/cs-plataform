# Next.js 16 + React 19 Best Practices

## Referências Oficiais
- [Next.js 16 Blog](https://nextjs.org/blog/next-16)
- [Next.js 16 Migration Guide](https://thecodeforge.io/javascript/next-js-react-migration-guide/)
- [React 19 Docs](https://react.dev)

## Server Components (Padrão)
```tsx
// Use Server Components por padrão
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Busca direta, sem useEffect
  const data = await fetchData(id);
  return <Component data={data} />;
}
```

## use() Hook (Data Fetching)
```tsx
// Prefira use() para fetching em Server Components
import { use } from 'react';

export default function Page() {
  const data = use(fetchData());
  return <Component data={data} />;
}
```

## API Routes (App Router)
```ts
// app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  // Lógica...
  return NextResponse.json({ data });
}
```

## Server Actions
```ts
// app/actions.ts
'use server';

export async function createItem(data: FormData) {
  'use server';
  // Validação com Zod
  // Mutation no banco
  revalidatePath('/dashboard');
  return { success: true };
}
```

## Partial Prerendering
```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      <StaticHeader />  {/* Prerendered */}
      <Suspense fallback={<Skeleton />}>
        <DynamicContent />  {/* Streamed */}
      </Suspense>
    </>
  );
}
```

## React Compiler (Otimização automáticas)
```tsx
// Habilitado por padrão no Next.js 16
// Não precisa de useMemo/useCallback manual na maioria dos casos
// Mas mantenha funções puras
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

##避 Grânicos

### Não faça
```tsx
// ❌ useEffect com fetch
useEffect(() => {
  fetch('/api/data').then(setData);
}, []);

// ❌ Client Component desnecessário
'use client';
export default function Page() { ... }

// ❌ Pages Router
// Pages Router foi removido no Next.js 16
```

### Faça
```tsx
// ✅ Server Component
export default async function Page() { ... }

// ✅ use() hook
import { use } from 'react';
const data = use(fetchData());

// ✅ Streaming com Suspense
<Suspense fallback={<Loading />}>
  <AsyncData />
</Suspense>
```

## Estrutura de Arquivos
```
src/
├── app/
│   ├── (dashboard)/        # Route group
│   │   ├── layout.tsx    # Layout específico
│   │   └── page.tsx
│   ├── api/              # API Routes
│   └── login/
├── components/
│   ├── ui/             # Radix + Tailwind
│   └── providers/        # Context providers
└── lib/
    ├── supabase/        # Cliente DB
    └── utils.ts       # Helpers
```

## Referências Adicionais
- [TheCodeForge - shadcn/ui + Tailwind v4](https://thecodeforge.io/javascript/build-design-system-shadcn-tailwind-radix/)
- [Hany Rabah - Design System com Radix](https://hanyrabah.com/blog/building-design-system-tailwind-radix)
- [DEV Community - Production Patterns](https://dev.to/ash_dubai/nextjs-16-with-react-19-production-patterns-mastering-next-js-16-2l69)