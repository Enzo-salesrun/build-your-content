// Shared components for reuse across pages
// These replace duplicated code in Team.tsx, Creators.tsx, etc.

export { 
  ProfileCard, 
  StatusBadge,
  getInitials,
  formatEngagement,
  type ProfileData,
  type ProfileCardProps,
  type ConnectionStatus,
  type SyncStatus,
} from './ProfileCard'

export { 
  ProfileFormModal,
  extractLinkedInId,
  type ProfileFormData,
  type ProfileFormModalProps,
} from './ProfileFormModal'

export {
  PageHeader,
  SearchBar,
  EmptyState,
  LoadingState,
  ActionButtonGroup,
} from './PageHeader'

export {
  ProfileActions,
  LinkedInActions,
  ManagementActions,
  connectLinkedIn,
  disconnectLinkedIn,
  type ProfileActionHandlers,
  type ProfileActionsProps,
} from './ProfileActions'
