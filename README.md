# The Night Ventures - Project Management System v1.0

A lightweight project management system for tracking projects, tasks, and team members.

## Dev DB

1) Set DATABASE_URL in .env.local to a **shared** Postgres (Vercel Postgres/Neon/Supabase).
2) npm run db:generate && npm run db:migrate
3) npm run db:import
4) npm run db:check  (should print [DB] OK)

## 🚀 Quick Start

### First Time Setup (New Machine)

```bash
# Clone the repository
git clone https://github.com/DoriFussmann/The-Night-Ventures-Project-Management-System-v1.0.git
cd The-Night-Ventures-Project-Management-System-v1.0

# Install dependencies and setup content
npm ci
npm run setup

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 💾 Data Persistence Across Machines

This app stores data in your browser's localStorage. To sync content across different machines:

### After Making Changes (Export)

```bash
npm run content:export
```

This will show you instructions to copy your data from the browser. Follow the steps to:
1. Copy the export script in your browser console
2. Paste the result into `content-data.json`
3. Commit and push to Git

### On a New Machine (Import)

```bash
# After cloning and installing
npm run setup
```

This will show you instructions to import your content into the browser's localStorage.

### Content Management Commands

```bash
npm run setup           # Setup content on new machine
npm run content:export  # Get export instructions
npm run content:import  # Get import instructions  
npm run content:status  # Show current content status
```

## 📁 Project Structure

```
├── index.html          # Main application page
├── admin.html          # Admin interface
├── app.js             # Main application logic
├── styles.css         # Application styles
├── content-data.json  # Your project data (tracked in Git)
├── content-manager.js # Data export/import utility
└── package.json       # Dependencies and scripts
```

## 🔄 Workflow for Team Collaboration

1. **Create/Edit Projects**: Use the web interface to manage projects and tasks
2. **Export Changes**: Run `npm run content:export` and follow instructions
3. **Commit & Push**: Add `content-data.json` to Git and push
4. **Team Sync**: Team members run `npm run setup` after pulling changes

## 🎯 Features

- **Project Management**: Create, edit, and track projects
- **Task Organization**: Organize tasks in Do/Doing/Done columns
- **Team Tracking**: Assign individuals to projects
- **Financial Tracking**: Track monthly impact and hours
- **Status Management**: Live, Potential, Lost, Archived statuses
- **Image Support**: Add project logos and images
- **Admin Interface**: Comprehensive project and task management

## 🛠️ Technical Details

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Build Tool**: Vite
- **Data Storage**: Browser localStorage (with Git sync via JSON)
- **No Backend Required**: Fully client-side application

## 📝 Data Format

Content is stored in `content-data.json` with this structure:

```json
{
  "projects": {
    "project_id": {
      "name": "Project Name",
      "description": "Project description",
      "individuals": ["Person 1", "Person 2"],
      "source": "EarlyStageLabs",
      "type": "Fractional CFO",
      "status": "Live",
      "monthlyImpact": 5000,
      "hoursPerMonth": 20,
      "tasks": {
        "todo": ["Task 1", "Task 2"],
        "doing": ["Task 3"],
        "done": ["Task 4"]
      },
      "imageDataUrl": "data:image/..."
    }
  },
  "version": "1.0.0",
  "lastExported": "2025-01-01T00:00:00.000Z"
}
```

## 🤝 Contributing

1. Make your changes in the web interface
2. Export your content: `npm run content:export`
3. Commit the updated `content-data.json`
4. Submit a pull request

## 📄 License

ISC License
