# climbr - Design Guidelines

## Brand Identity
**climbr** is a dark-themed focus timer app with a bold, minimalist aesthetic. The app uses a deep slate background with white text and magma orange accents. The central feature is an animated SVG showing stick figures climbing a hill and pushing a boulder - a metaphor for progress through focused work sessions.

**Memorable Element**: The circular climbing animation that visualizes work progress through the simple, playful stick figure pushing a boulder up a hill.

## Navigation Architecture
**Root Navigation**: Bottom Tab Bar (3 tabs)
- Squads (left tab)
- Timer (center tab, elevated) - DEFAULT SCREEN
- Profile (right tab)

## Color Palette
- **Background**: Deep slate (#1A1A1B)
- **Primary Text**: White (#FFFFFF)
- **Secondary Text**: White at 30-40% opacity
- **Primary Accent**: Magma orange (for interactive elements)
- **Surface**: Dark semi-transparent (#0A0A0A at 80% opacity)
- **Borders**: White at 5% opacity
- **Active Tab**: White
- **Inactive Tab**: White at 30% opacity

## Typography
- Use system fonts (React Native default)
- **Hierarchy**: Bold for mode selector, regular for labels
- **Sizes**: Small for tab labels, medium for mode selector

## Screen-by-Screen Specifications

### Bottom Navigation Bar
- **Position**: Fixed to bottom, z-index 30
- **Dimensions**: Full width × 96px tall
- **Background**: Dark semi-transparent (#0A0A0A) at 80% opacity with backdrop blur
- **Border**: 1px top border, white at 5% opacity
- **Padding**: 32px horizontal, 32px bottom
- **Layout**: Flexbox with space-between, items centered vertically

**Tab Buttons**:
- Left Tab (Squads): User/people icon (24px), "Squads" label, column layout with 4px gap
- Center Tab (Timer): 64px × 64px circular button, raised -16px from bottom, clock icon (32px), white background when active with drop shadow, scales 1→1.1→1 when timer running
- Right Tab (Profile): User profile icon (24px), "Profile" label, column layout with 4px gap
- All tabs: White when active, white at 30% opacity when inactive, scale to 0.9 on tap

### Timer Screen (Main)
- **Header**: "Mode: Solo" or "Mode: Room" text (white, bold, medium), centered at top, tappable to open mode selector
- **Main Content**: 250px × 250px circular white container, centered vertically and horizontally
  - 4px black border, rounded fully, large drop shadow, cursor pointer
  - Contains SVG animation (viewbox 0 0 200 200)
  - SVG elements: Black hill path (bezier curve at bottom), black boulder (radius 35), main stick figure (1.5x scale, black strokes - head 5px circle, body/arms/legs as lines)
  - Room mode adds 2 smaller figures (0.8x and 0.7x scale, left of main, opacity 0.6 and 0.4)
  - When paused: dark overlay (black at 40% opacity) with Play/Pause icon (72px, white, 50% opacity)
- **Safe Area**: Top inset should be insets.top + spacing, bottom inset should be tabBarHeight (96px) + spacing

### Squads Screen
- TBD (to be specified)

### Profile Screen
- TBD (to be specified)

## Visual Design
- All touchable elements scale to 0.9 on press
- Center timer button has continuous scale animation (1→1.1→1) when active and running
- Active timer button has drop shadow: 0 0 20px rgba(255,255,255,0.2)
- Circular shapes use overflow: hidden to maintain shape
- Use Feather icons from @expo/vector-icons

## Assets to Generate
1. **app-icon.png** - App icon featuring the stick figure climbing metaphor, magma orange accent on dark slate background. WHERE USED: Device home screen
2. **splash-icon.png** - Simplified version of app icon for launch screen. WHERE USED: App launch screen
3. **climbing-animation-reference.svg** - Reference SVG showing the hill, boulder, and stick figure positions for animation implementation. WHERE USED: Timer screen central animation