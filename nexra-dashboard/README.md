# NEXRA Dashboard

Mobile-first SaaS dashboard for NEXRA SMS Platform built with React and Tailwind CSS.

## Features

✅ **Authentication**
- Login / Register pages
- JWT token management
- Protected routes

✅ **Dashboard**
- Overview statistics (sent, delivered, failed)
- Recent campaigns
- Credit balance display
- Quick actions

✅ **Campaign Management**
- List all campaigns
- Create campaign (4-step wizard)
  - Campaign details
  - Select contacts
  - Compose message
  - Schedule or send now
- Campaign status tracking

✅ **Contact Management**
- View all contacts
- Upload CSV files
- Contact list with search

✅ **Message Tracking**
- View all messages
- Filter by status (pending, sent, delivered, failed)
- Real-time delivery status
- Message details

✅ **Credit Balance**
- Always visible in header
- Real-time balance updates
- Mobile-optimized display

## Tech Stack

- **React 18** (via CDN)
- **Tailwind CSS** (via CDN)
- **Axios** for API calls
- **Lucide Icons** for UI icons
- **Vanilla JavaScript** (no build step required)

## Setup

1. **Configure API URL**

Edit `app.js` and update the API base URL:

```javascript
const API_BASE_URL = 'http://localhost:8000/api/v1';  // Change this to your API URL
```

2. **Serve the files**

You can use any static file server. For example:

```bash
# Using Python
python -m http.server 8080

# Using Node.js http-server
npx http-server -p 8080

# Using PHP
php -S localhost:8080
```

3. **Open in browser**

Navigate to `http://localhost:8080`

## File Structure

```
nexra-dashboard/
├── index.html          # Main HTML file with CDN imports
├── app.js              # Complete React application
└── README.md           # This file
```

## Mobile-First Design

The dashboard is optimized for mobile devices:

- **Bottom Navigation**: Fixed nav bar on mobile screens
- **Responsive Layouts**: Adapts from mobile to desktop
- **Touch-Friendly**: Large tap targets (44px minimum)
- **Optimized Forms**: Mobile-friendly inputs and modals
- **Fast Loading**: Minimal dependencies, CDN-based

### Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## API Integration

The dashboard expects the following API endpoints:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user

### Campaigns
- `GET /campaigns` - List campaigns
- `POST /campaigns` - Create campaign
- `GET /campaigns/:id` - Get campaign details

### Contacts
- `GET /contacts` - List contacts
- `POST /contacts/upload` - Upload CSV

### Messages
- `GET /messages` - List messages
- `GET /messages/stats` - Get message statistics

### Billing
- `GET /billing/balance` - Get credit balance

## Usage

### Login

Default test credentials (if using demo API):
- Email: `demo@nexra.com`
- Password: `demo123`

### Creating a Campaign

1. Click "New Campaign" from dashboard
2. Enter campaign name and sender ID
3. Select contacts from your list
4. Compose your message
5. Choose to send now or schedule
6. Confirm and send

### Uploading Contacts

1. Go to Contacts page
2. Click "Upload CSV"
3. Select CSV file with columns: `first_name`, `last_name`, `phone_number`
4. Confirm upload

## Customization

### Colors

Edit the Tailwind config in `index.html`:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
                    500: '#3b82f6',  // Change primary color
                    600: '#2563eb',
                    700: '#1d4ed8',
                }
            }
        }
    }
}
```

### Branding

Update the logo/brand name in:
- `index.html` - Page title
- `LoginPage` component - Brand name
- `RegisterPage` component - Brand name
- `Sidebar` component - Logo

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- **First Load**: < 2s on 3G
- **Page Transitions**: Instant (SPA)
- **Bundle Size**: ~0KB (CDN-based)

## Security

- JWT tokens stored in localStorage
- Automatic token refresh
- 401 redirect to login
- HTTPS recommended for production

## Production Deployment

1. Update `API_BASE_URL` to production API
2. Enable HTTPS
3. Configure CORS on API server
4. Deploy to static hosting (Vercel, Netlify, GitHub Pages, etc.)

## License

MIT License - NEXRA Platform
