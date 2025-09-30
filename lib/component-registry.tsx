import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Registry of shadcn UI components available to generated apps
 */
export const ComponentRegistry = {
  // shadcn components
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Textarea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  
  // React utilities
  Fragment: React.Fragment,
  createElement: React.createElement,
};

/**
 * Get list of available components for AI prompt
 */
export function getAvailableComponents(): string {
  return `
AVAILABLE SHADCN UI COMPONENTS:
- Button: Styled button with variants (default, destructive, outline, secondary, ghost, link)
- Input: Styled input field
- Label: Form label
- Card, CardHeader, CardTitle, CardDescription, CardContent: Card components
- Badge: Small badge with variants (default, secondary, destructive, outline)
- Textarea: Multi-line text input
- AlertDialog components: For dialogs/modals

USAGE EXAMPLES:
// Button
React.createElement(Button, { variant: 'default', onClick: () => {} }, 'Click Me')
React.createElement(Button, { variant: 'destructive', size: 'sm' }, 'Delete')

// Input
React.createElement(Input, { value: text, onChange: (e) => setText(e.target.value), placeholder: 'Enter text...' })

// Card
React.createElement(Card, { className: 'p-4' },
  React.createElement(CardHeader, {},
    React.createElement(CardTitle, {}, 'Title'),
    React.createElement(CardDescription, {}, 'Description')
  ),
  React.createElement(CardContent, {}, 'Content here')
)

// Badge
React.createElement(Badge, { variant: 'secondary' }, 'Label')

// Textarea
React.createElement(Textarea, { value: text, onChange: (e) => setText(e.target.value), rows: 4 })

You can also use primitive HTML elements: div, span, h1, h2, h3, p, img, form, etc.
`;
}
