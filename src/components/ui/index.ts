export { Avatar, AvatarImage, AvatarFallback } from './avatar'
export { Badge, badgeVariants } from './badge'
export { Button, buttonVariants } from './button'
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card'
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'
export { Input } from './input'
export { Label } from './label'
export { ScrollArea, ScrollBar } from './scroll-area'
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './select'
export { Separator } from './separator'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'
export { Textarea } from './textarea'
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible'
export { Switch } from './switch'
export { Slider } from './slider'
export { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card'
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './table'
export { Popover, PopoverTrigger, PopoverContent } from './popover'

// Generic ComboBox (new unified component)
export { 
  ComboBox, 
  TopicComboBox, 
  CreatorComboBox,
  type ComboBoxItem, 
  type ComboBoxProps,
  type TopicItem,
  type CreatorItem,
} from './combobox'

// Legacy exports (deprecated - use ComboBox instead)
export { TopicSelect, type Topic } from './topic-select'
export { CreatorSelect, type Creator } from './creator-select'
export { SearchableSelect } from './searchable-select'
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './sheet'

// Multimodal AI Input (voice + screenshot + text)
export { 
  MultimodalInput, 
  useMultimodalInput,
  type Attachment,
  type MultimodalInputProps,
} from './multimodal-input'
