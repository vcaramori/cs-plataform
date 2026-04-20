import { AccountForm } from './components/AccountForm'

export const metadata = {
  title: 'CS-Continuum | Novo Cliente',
}

export default function NewAccountPage() {
  return <AccountForm mode="create" />
}
