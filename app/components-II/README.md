# Beacon UI Kit

A reusable React + Tailwind CSS v4 component library, built around the
`app-*` design tokens already used in your Beacon Edu. Consult project.

## 1. Required Tailwind theme tokens

Every component references the same custom color tokens rather than raw
hex values, so the whole kit reskins from one place. Define these once in
your Tailwind v4 `@theme` block (or wherever your existing `app-primary`
etc. are declared) — nothing new is required beyond what your original
files already assumed:

```css
@theme {
  --color-app-bg: ...;
  --color-app-surface: ...;
  --color-app-surface-muted: ...;
  --color-app-border: ...;
  --color-app-text: ...;
  --color-app-text-secondary: ...;
  --color-app-primary: ...;
  --color-app-primary-hover: ...;
  --color-app-accent: ...;
  --font-display: ...;
}
```

If any of these aren't defined yet, tell me the palette (or point me at
your Tailwind config) and I'll fill in real values instead of placeholders.

## 2. File layout

```
components/
  Button.jsx        Button, IconButton
  FormControls.jsx   Input, Textarea, Select, Checkbox, RadioGroup, Switch
  DataDisplay.jsx    Card, Badge, Avatar, AvatarGroup, Table
  Feedback.jsx       Alert, ToastProvider/useToast, ProgressBar, Skeleton, EmptyState
  Overlay.jsx        Modal, Tooltip, Dropdown
  Navigation.jsx     Navbar, Tabs, Breadcrumbs, Pagination, Accordion
  index.js           barrel — import everything from one place
```

Drop the `components/` folder into your `src/` and import from it:

```jsx
import { Button, Card, Input, Modal } from './components';
```

## 3. Notes on what changed from your original file

- Removed the Font Awesome `<i className="fas fa-plus">` icon dependency —
  everything now uses inline SVG so the kit has zero external icon
  dependency. Swap in `lucide-react` icons instead if you'd rather; every
  icon slot just takes a React node.
- `Button` and `IconButton` are `forwardRef`, gained `outline` and `danger`
  variants, an `xs` size, `isLoading`/`leftIcon`/`rightIcon`/`fullWidth`.
- `Card` is now a compound component: `Card.Header`, `Card.Title`,
  `Card.Description`, `Card.Footer`, alongside the plain-children usage
  you already had.
- `Input` gained `label`/`error`/`helperText`/`leftIcon`/`rightIcon` and
  auto-generates an `id` via `useId` so labels are always wired up
  correctly.
- New form controls: `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`.
- New feedback primitives: `Alert`, a `ToastProvider` + `useToast()` hook,
  `ProgressBar`, `Skeleton`, `EmptyState`.
- New overlays: `Modal` (ESC + backdrop close), `Tooltip`, `Dropdown` menu
  (closes on outside click).
- New navigation: `Tabs`, `Breadcrumbs`, `Pagination`, `Accordion`,
  alongside a slightly slimmed-down `Navbar` (now takes a `brand` prop and
  uses the shared `Avatar` component instead of a raw `<img>`).
- Your standalone checkout-card markup (plain HTML/Tailwind, Visa +
  Apple Pay) wasn't converted into a component since it's very specific to
  one payment flow — happy to turn it into a `Checkout` / `PaymentMethodPicker`
  component too if you want it in the kit.

## 4. Usage examples

```jsx
import { Button, Card, Input, Modal, useToast, ToastProvider } from './components';

function Example() {
  const { showToast } = useToast();

  return (
    <Card>
      <Card.Header>
        <Card.Title>New student record</Card.Title>
      </Card.Header>
      <Input label="Full name" placeholder="e.g. Ama Serwaa" required />
      <Card.Footer>
        <Button variant="primary" onClick={() => showToast('Saved', { variant: 'success' })}>
          Save
        </Button>
      </Card.Footer>
    </Card>
  );
}

// Wrap once near the root:
// <ToastProvider><App /></ToastProvider>
```

## 5. Accessibility baked in

- Every interactive element has a visible focus ring
  (`focus-visible:ring-2`).
- Form controls always render a linked `<label htmlFor>`.
- `Modal` traps ESC-to-close and labels itself via `aria-label`/`aria-modal`.
- `Dropdown`/`Tabs`/`Accordion` use the relevant ARIA roles
  (`menu`/`menuitem`, `tablist`/`tab`, `aria-expanded`).
