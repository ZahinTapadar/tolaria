import { Archive, FileText, Graph, Tray, Terminal, Database, CodeBlock, Function } from '@phosphor-icons/react'
import type { SidebarSelection } from '../../types'
import { isSelectionActive, NavItem } from '../SidebarParts'
import { translate, type AppLocale } from '../../lib/i18n'

interface SidebarTopNavProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  showInbox: boolean
  inboxCount: number
  activeCount: number
  archivedCount: number
  locale?: AppLocale
  loading?: boolean
}

export function SidebarTopNav({
  selection,
  onSelect,
  showInbox,
  inboxCount,
  activeCount,
  archivedCount,
  locale = 'en',
  loading = false,
}: SidebarTopNavProps) {
  return (
    <div className="border-b border-border" data-testid="sidebar-top-nav" style={{ padding: '4px 6px' }}>
      {showInbox && (
        <NavItem
          icon={Tray}
          label={translate(locale, 'sidebar.nav.inbox')}
          count={inboxCount}
          countLoading={loading}
          isActive={isSelectionActive(selection, { kind: 'filter', filter: 'inbox' })}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          activeBadgeClassName="bg-primary text-primary-foreground"
          onClick={() => onSelect({ kind: 'filter', filter: 'inbox' })}
        />
      )}
      <NavItem
        icon={FileText}
        label={translate(locale, 'sidebar.nav.allNotes')}
        count={activeCount}
        countLoading={loading}
        isActive={isSelectionActive(selection, { kind: 'filter', filter: 'all' })}
        badgeClassName="text-muted-foreground"
        badgeStyle={{ background: 'var(--muted)' }}
        activeBadgeClassName="bg-primary text-primary-foreground"
        onClick={() => onSelect({ kind: 'filter', filter: 'all' })}
      />
      <NavItem
        icon={Archive}
        label={translate(locale, 'sidebar.nav.archive')}
        count={archivedCount}
        countLoading={loading}
        isActive={isSelectionActive(selection, { kind: 'filter', filter: 'archived' })}
        badgeClassName="text-muted-foreground"
        badgeStyle={{ background: 'var(--muted)' }}
        activeBadgeClassName="bg-primary text-primary-foreground"
        onClick={() => onSelect({ kind: 'filter', filter: 'archived' })}
      />
      <NavItem
        icon={Graph}
        label={translate(locale, 'sidebar.nav.graph')}
        isActive={selection.kind === 'graph'}
        onClick={() => onSelect({ kind: 'graph', mode: 'global' })}
      />
      <div className="mt-2 mb-1 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Code
      </div>
      <NavItem
        icon={Terminal}
        label={translate(locale, 'sidebar.nav.python')}
        isActive={selection.kind === 'python'}
        onClick={() => onSelect({ kind: 'python' })}
      />
      <NavItem
        icon={Database}
        label={translate(locale, 'sidebar.nav.sqlite')}
        isActive={selection.kind === 'sqlite'}
        onClick={() => onSelect({ kind: 'sqlite' })}
      />
      <NavItem
        icon={Function}
        label={translate(locale, 'sidebar.nav.desmos')}
        isActive={selection.kind === 'desmos'}
        onClick={() => onSelect({ kind: 'desmos' })}
      />
      <NavItem
        icon={CodeBlock}
        label={translate(locale, 'sidebar.nav.cpp')}
        isActive={selection.kind === 'cpp'}
        onClick={() => onSelect({ kind: 'cpp' })}
      />
    </div>
  )
}
