'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Plus, UserRound } from 'lucide-react'

const links = [
  { href: '/home', label: 'Início', icon: Home },
  { href: '/stations', label: 'Postos', icon: MapPin },
  { href: '/report', label: 'Atualizar', icon: Plus },
  { href: '/profile', label: 'Perfil', icon: UserRound },
]
export function BottomNav() {
  const pathname = usePathname()
  return <nav className="bottom-nav" aria-label="Navegação principal"><div className="bottom-nav-inner">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`nav-item ${pathname === href ? 'active' : ''}`}><Icon size={22} strokeWidth={2} /><span>{label}</span></Link>)}</div></nav>
}
