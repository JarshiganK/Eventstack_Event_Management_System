# EventStack User Manual

**Document Version:** 1.0  
**Publication Date:** January 2025  
**System Version:** 1.0.0  
**Platform:** EventStack - Event Management Platform

---

## Document Information

| Field | Information |
|-------|-------------|
| **Document Title** | EventStack User Manual |
| **Version** | 1.0 |
| **Date** | January 2025 |
| **Classification** | User Documentation |
| **Target Audience** | End Users, Administrators, Event Organizers |
| **Format** | PDF (Recommended) |

---

## Development Team

**Group Members:**
- [Member 1 Index Number] - [Name]
- [Member 2 Index Number] - [Name]
- [Member 3 Index Number] - [Name]
- [Member 4 Index Number] - [Name]

---

## Copyright and Disclaimer

© 2025 EventStack Development Team. All rights reserved.

This document contains proprietary and confidential information. The information in this manual is subject to change without notice. The development team assumes no responsibility for any errors or omissions in this documentation.

**Template Reference:** This manual follows documentation standards from Microsoft Technical Documentation and GitHub open-source project guidelines.

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 Overview
   - 1.2 Purpose of This Document
   - 1.3 System Capabilities
2. [System Requirements](#2-system-requirements)
   - 2.1 Server-Side Requirements
   - 2.2 Client-Side Requirements
   - 2.3 Optional Components
3. [Installation Guide](#3-installation-guide)
   - 3.1 Prerequisites
   - 3.2 Automated Installation (Recommended)
   - 3.3 Deployment Script Options
   - 3.4 Stopping EventStack
   - 3.5 Manual Installation (Advanced)
4. [Getting Started](#4-getting-started)
   - 4.1 First-Time Access
   - 4.2 Default Admin Account
   - 4.3 Logging In
   - 4.4 Creating a New Account
5. [User Roles](#5-user-roles)
   - 5.1 Regular User (USER)
   - 5.2 Event Organizer (ORGANIZER)
   - 5.3 Administrator (ADMIN)
6. [For Regular Users](#6-for-regular-users)
   - 6.1 Browsing Events
   - 6.2 Searching Events
   - 6.3 Filtering Events
   - 6.4 Viewing Event Details
   - 6.5 Bookmarking Events
   - 6.6 Managing Your Profile
7. [For Event Organizers](#7-for-event-organizers)
   - 7.1 Organizer Login
   - 7.2 Organizer Dashboard
   - 7.3 Creating a New Event
   - 7.4 Adding Event Images
   - 7.5 Managing Event Expenses
   - 7.6 Using Budget Bot
8. [For Administrators](#8-for-administrators)
   - 8.1 Admin Login
   - 8.2 Admin Dashboard
   - 8.3 Managing Events
   - 8.4 Managing Users
   - 8.5 Viewing System Analytics
9. [Troubleshooting](#9-troubleshooting)
   - 9.1 Common Issues
   - 9.2 Getting Help
10. [Reference](#10-reference)
    - 10.1 Keyboard Shortcuts
    - 10.2 Supported File Formats
    - 10.3 Browser Compatibility
    - 10.4 System Endpoints
    - 10.5 Default System Accounts
    - 10.6 Configuration Reference
11. [Document History](#11-document-history)
12. [Conclusion](#12-conclusion)

---

## 1. Introduction

### 1.1 Overview

EventStack is an enterprise-grade event management platform designed to facilitate event discovery, organization, and administration. The system provides role-based access control with specialized interfaces for end users, event organizers, and system administrators, ensuring that each user type has access to appropriate functionality tailored to their responsibilities.

### 1.2 Purpose of This Document

This user manual provides comprehensive instructions for installing, configuring, and operating the EventStack platform. It is intended for system administrators responsible for deployment, end users who will interact with the platform, event organizers managing events, and administrators overseeing system operations.

### 1.3 System Capabilities

EventStack offers the following core capabilities:

- **Event Discovery and Search**: Advanced browsing and search functionality for discovering events across multiple categories
- **Event Bookmarking**: Personal event management through bookmarking and favorites
- **Event Lifecycle Management**: Complete event creation, editing, and management workflows for organizers and administrators
- **Financial Management**: Comprehensive expense tracking with detailed analytics and reporting
- **AI-Powered Budget Analysis**: Intelligent budget assistant (Budget Bot) providing real-time financial insights and recommendations
- **User Administration**: Enterprise-level user management, role assignment, and system analytics for administrators

---

## 2. System Requirements

### 2.1 Server-Side Requirements

The following components must be installed and configured on the server hosting EventStack:

| Component | Minimum Version | Recommended Version | Notes |
|-----------|----------------|---------------------|-------|
| **Operating System** | Windows 10, macOS 10.15, or Linux (Ubuntu 20.04+) | Latest stable release | Cross-platform support |
| **Node.js** | 18.0.0 | 20.x LTS or higher | Required for runtime execution |
| **npm** | 9.0.0 | Latest stable | Package manager (bundled with Node.js) |
| **PostgreSQL** | 12.0 | 15.x or higher | Database server |
| **RAM** | 4 GB | 8 GB or higher | For optimal performance |
| **Storage** | 2 GB free space | 5 GB or higher | For application and database files |
| **Network** | Internet connection | Stable broadband | For API access and updates |

### 2.2 Client-Side Requirements

End users accessing EventStack require the following:

| Component | Requirement | Notes |
|-----------|-------------|-------|
| **Web Browser** | Chrome 90+, Firefox 88+, Edge 90+, or Safari 14+ | Latest versions recommended for best compatibility |
| **JavaScript** | Enabled | Required for application functionality |
| **Internet Connection** | Stable connection | Required for accessing the web application |
| **Screen Resolution** | 1280x720 minimum | 1920x1080 recommended for optimal experience |

### 2.3 Optional Components

The following components are optional but enhance system functionality:

- **Google Gemini API Key**: Required for Budget Bot AI functionality. Obtain from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Email Service**: For notification delivery (if notification features are implemented)

---

## 3. Installation Guide

### 3.1 Prerequisites

Prior to installation, ensure that all required software components are installed and properly configured on the target system.

#### 3.1.1 Node.js and npm Installation

1. **Download Node.js**
   - Navigate to the official Node.js website: https://nodejs.org/
   - Download the LTS (Long Term Support) version appropriate for your operating system
   - Execute the installer and follow the installation wizard

2. **Verify Installation**
   - Open a terminal or command prompt
   - Execute the following commands to verify successful installation:
     ```bash
     node --version
     npm --version
     ```
   - Expected output should display version numbers (e.g., `v20.10.0` and `10.2.3`)

#### 3.1.2 PostgreSQL Database Installation

1. **Download PostgreSQL**
   - Navigate to the official PostgreSQL website: https://www.postgresql.org/download/
   - Select the appropriate version for your operating system
   - Execute the installer and complete the setup process
   - **Important**: During installation, note the PostgreSQL superuser password you configure

2. **Post-Installation Configuration**
   - Ensure the PostgreSQL service is running
   - Document the following connection parameters for use during EventStack configuration:
     - Database host (typically `localhost`)
     - Port number (default: `5432`)
     - Superuser credentials (username and password)
     - Target database name (will be created during installation)

### 3.2 Automated Installation (Recommended)

EventStack provides an automated deployment script that streamlines the installation process by handling database initialization, dependency management, and service configuration. This method is recommended for standard deployments and significantly reduces manual configuration errors.

#### Step 1: Download or Clone the Project

If you have the project files, navigate to the project directory. If cloning from a repository:

```
git clone [repository-url]
cd eventstack
```

**Screenshot Placeholder:** [Screenshot showing the project directory structure]

#### Step 2: Configure Database Credentials (Optional)

The deployment script uses default values, but you can customize them. Open PowerShell and navigate to the project directory, then run the script with your parameters:

```powershell
.\deploy-eventstack.ps1 -DbUser "postgres" -DbPassword "yourpassword" -DbName "eventstack"
```

**Default Values:**
- Database Name: `eventstack`
- Database Host: `localhost`
- Database Port: `5432`
- Database User: `postgres`
- Backend Port: `4000`
- Frontend Port: `5173`

**Screenshot Placeholder:** [Screenshot showing PowerShell with script parameters]

#### Step 3: Run the Deployment Script

1. Open PowerShell (as Administrator if needed)
2. Navigate to the EventStack project directory:
   ```
   cd D:\Projects\2YP\Event\eventstack
   ```
   (Replace with your actual project path)

3. Run the deployment script:
   ```powershell
   .\deploy-eventstack.ps1
   ```

**Screenshot Placeholder:** [Screenshot of PowerShell showing the script execution start]

4. The script will automatically:
   - ✅ Check for required tools (Node.js, npm, PostgreSQL)
   - ✅ Create the database if it doesn't exist
   - ✅ Apply the database schema (creates all tables)
   - ✅ Create default admin account (admin@eventstack.com / admin123)
   - ✅ Generate backend `.env` file with correct configuration
   - ✅ Install backend dependencies
   - ✅ Install frontend dependencies
   - ✅ Start backend server in a new window
   - ✅ Start frontend server in a new window

**Screenshot Placeholder:** [Screenshot showing the deployment script progress with checkmarks]

#### Step 4: Wait for Services to Start

The script will open two new PowerShell windows:
- **Backend Server Window**: Running on `http://localhost:4000`
- **Frontend Server Window**: Running on `http://localhost:5173`

Wait for both servers to finish starting (you'll see "ready" messages in their windows).

**Screenshot Placeholder:** [Screenshot showing both server windows running]

#### Step 5: Access the Application

Once both servers are running, open your web browser and navigate to:

```
http://localhost:5173
```

**Screenshot Placeholder:** [Screenshot of the EventStack homepage]

#### Step 6: (Optional) Load Sample Data

If you want sample events and users for testing, run the script with the `-LoadSampleData` flag:

```powershell
.\deploy-eventstack.ps1 -LoadSampleData
```

**Screenshot Placeholder:** [Screenshot showing sample data being loaded]

### 3.3 Deployment Script Options

The deployment script supports several options:

| Option | Description |
|--------|-------------|
| `-DbName` | Database name (default: `eventstack`) |
| `-DbHost` | Database host (default: `localhost`) |
| `-DbPort` | Database port (default: `5432`) |
| `-DbUser` | Database username (default: `postgres`) |
| `-DbPassword` | Database password (default: `postgres`) |
| `-BackendPort` | Backend server port (default: `4000`) |
| `-FrontendPort` | Frontend server port (default: `5173`) |
| `-JwtSecret` | JWT secret key (default: `change-me-now`) |
| `-SkipDb` | Skip database setup |
| `-SkipBackend` | Skip backend startup |
| `-SkipFrontend` | Skip frontend startup |
| `-LoadSampleData` | Load sample events and users |
| `-ProdFrontend` | Build and serve frontend in production mode |

**Example with custom settings:**
```powershell
.\deploy-eventstack.ps1 -DbPassword "MySecurePassword" -LoadSampleData
```

**Screenshot Placeholder:** [Screenshot showing script help or options]

### 3.4 Stopping EventStack

When you're finished using EventStack:

1. **To keep the database**: Press `Ctrl+C` in the deployment script window
   - This will stop all services but keep your database intact

2. **To drop the database**: Press `Enter` in the deployment script window
   - This will stop all services and remove the database

**Screenshot Placeholder:** [Screenshot showing the cleanup prompt]

**Screenshot Placeholder:** [Screenshot showing cleanup process]

### 3.5 Manual Installation (Advanced)

If you prefer to set up EventStack manually without the deployment script, follow these steps:

#### Manual Backend Setup

1. Navigate to the backend directory:
   ```
   cd apps/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your database credentials (the deployment script does this automatically)

4. Set up the database manually using `psql` or pgAdmin

#### Manual Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd apps/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

---

## 4. Getting Started

### 4.1 First-Time Access

When you first open EventStack, you'll see the home page with a list of available events. You can browse events without logging in, but you'll need an account to:

- Bookmark events
- View your profile
- Create or manage events (Organizers/Admins)
- Access expense tracking (Organizers)

**Screenshot Placeholder:** [Screenshot of the EventStack homepage showing event listings]

### 4.2 Default Admin Account

EventStack automatically creates a default administrator account during installation:

- **Email**: `admin@eventstack.com`
- **Password**: `admin123`
- **Role**: Administrator

You can use this account immediately after installation to access all admin features.

**Important Security Note**: Change the default admin password after first login for security purposes.

**Screenshot Placeholder:** [Screenshot showing admin login with default credentials]

### 4.3 Logging In

1. Click the **"Login"** button in the navigation bar (bottom of the screen on mobile, or top on desktop)

**Screenshot Placeholder:** [Screenshot showing the navigation bar with Login button]

2. Enter your email and password

3. Click **"Login"** to access your account

**Screenshot Placeholder:** [Screenshot of the login page with email and password fields]

**For Admin Access:**
- Navigate to `/admin/login` or click "Admin Login" if available
- Use the default admin credentials: `admin@eventstack.com` / `admin123`

**Screenshot Placeholder:** [Screenshot of the admin login page]

### 4.4 Creating a New Account

If you need to create a regular user or organizer account:

1. Click the **"Login"** button in the navigation bar

2. On the login page, click **"Register"** or **"Sign Up"** link

**Screenshot Placeholder:** [Screenshot showing the Register link on login page]

3. Fill in the registration form:
   - **Email**: Your email address
   - **Password**: Choose a strong password (minimum 6 characters)

4. Click **"Register"** to create your account

5. You will be automatically logged in after registration

**Screenshot Placeholder:** [Screenshot of the registration form with fields filled]

---

## 5. User Roles

EventStack has three types of user roles:

### 5.1 Regular User (USER)
- Browse and search events
- View event details
- Bookmark favorite events
- View and edit profile

### 5.2 Event Organizer (ORGANIZER)
- All Regular User features
- Create and manage events
- Track event expenses
- Use Budget Bot for financial analysis

### 5.3 Administrator (ADMIN)
- All Organizer features
- Manage all events in the system
- View system analytics
- Manage users (view, update roles, activate/deactivate, delete)

---

## 6. For Regular Users

### 6.1 Browsing Events

1. On the home page, you'll see a list of events displayed as cards
2. Each event card shows:
   - Event title
   - Date and time
   - Venue name
   - Categories
   - Cover image (if available)

3. Scroll down to see more events

**Screenshot Placeholder:** [Screenshot of the home page with event cards displayed in a grid layout]

**Screenshot Placeholder:** [Screenshot showing a single event card with all details visible]

### 6.2 Searching Events

1. Use the search bar at the top of the home page
2. Type keywords related to:
   - Event title
   - Venue name
   - Categories
   - Event description

3. Results will update automatically as you type

4. To clear the search, delete the text in the search bar

**Screenshot Placeholder:** [Screenshot of the search bar with search term entered]

**Screenshot Placeholder:** [Screenshot showing search results filtered by the search term]

### 6.3 Filtering Events

1. On the home page, you'll find filter options:
   - **Date Range**: Filter events by start date
   - **Categories**: Filter by event categories (Technology, Music, Sports, etc.)

2. Select your desired filters

3. The event list will update to show only matching events

4. To remove filters, clear your selections

**Screenshot Placeholder:** [Screenshot showing filter options panel with date range and category filters]

**Screenshot Placeholder:** [Screenshot showing filtered event results based on selected filters]

### 6.4 Viewing Event Details

1. Click on any event card to view full details

2. The event detail page shows:
   - Full event title and description
   - Start and end date/time
   - Venue information
   - All event images
   - Categories
   - Bookmark button (if logged in)

**Screenshot Placeholder:** [Screenshot of event detail page]

### 6.5 Bookmarking Events

1. Make sure you're logged in

2. Navigate to an event detail page

3. Click the **"Bookmark"** or **"Save"** button

4. The event is now saved to your bookmarks

5. To view your bookmarks:
   - Click the **"Bookmarks"** icon in the navigation bar
   - You'll see all your saved events

6. To remove a bookmark:
   - Go to the event detail page
   - Click the **"Remove Bookmark"** button
   - Or remove it from your bookmarks page

**Screenshot Placeholder:** [Screenshot of bookmarks page]

### 6.6 Managing Your Profile

1. Click the **"Profile"** icon in the navigation bar

2. Your profile page shows:
   - Your email address
   - Your user role
   - Account creation date

3. You can update your profile information (if the feature is available)

**Screenshot Placeholder:** [Screenshot of profile page]

---

## 7. For Event Organizers

### 7.1 Organizer Login

1. Click the **"Login"** button in the navigation bar

2. Select **"Organizer Login"** or navigate to `/organizer/login`

3. Enter your organizer email and password

4. Click **"Login"**

**Note:** You must have an ORGANIZER role account. Contact an administrator if you need organizer access.

**Screenshot Placeholder:** [Screenshot of organizer login page]

### 7.2 Organizer Dashboard

After logging in as an organizer, you'll see your dashboard showing:

- List of events you've created
- Quick statistics about your events
- Options to create new events

**Screenshot Placeholder:** [Screenshot of organizer dashboard]

### 7.3 Creating a New Event

1. From the organizer dashboard, click **"Create New Event"** or **"Add Event"**

2. Fill in the event form:
   - **Title**: Name of your event (required)
   - **Summary**: Brief description of the event
   - **Start Date & Time**: When the event begins (required)
   - **End Date & Time**: When the event ends (required)
   - **Venue Name**: Location of the event
   - **Categories**: Select or enter categories (comma-separated)

3. Click **"Create Event"** or **"Save"**

4. You'll be redirected to the event detail page

**Screenshot Placeholder:** [Screenshot of create event form]

### 7.4 Adding Event Images

1. Navigate to your event's detail page

2. Click **"Add Image"** or **"Upload Image"**

3. Select an image file from your computer

4. The image will be uploaded and displayed on the event page

5. You can add multiple images to an event

**Screenshot Placeholder:** [Screenshot of image upload interface]

### 7.5 Managing Event Expenses

#### Accessing Expense Tracking

1. From your organizer dashboard, click on an event

2. Navigate to the **"Expenses"** tab or section

3. You'll see the expense management interface

**Screenshot Placeholder:** [Screenshot of expense management page]

#### Adding an Expense

1. Click **"Add Expense"** or **"New Expense"**

2. Fill in the expense form:
   - **Label**: Name/description of the expense (e.g., "Catering", "Sound System")
   - **Category**: Select from predefined categories (GENERAL, VENUE, CATERING, etc.)
   - **Vendor**: Name of the vendor/supplier (optional)
   - **Quantity**: Number of units (default: 1)
   - **Estimated Cost**: Your planned budget for this item
   - **Actual Cost**: Actual amount spent (can be updated later)
   - **Status**: 
     - **PLANNED**: Not yet committed
     - **COMMITTED**: Agreed upon but not paid
     - **PAID**: Payment completed
   - **Incurred On**: Date when expense occurred (optional)
   - **Notes**: Additional information (optional)

3. Click **"Save"** or **"Add Expense"**

**Screenshot Placeholder:** [Screenshot of add expense form]

#### Viewing Expense Summary

The expense page displays:

- **Total Planned Spend**: Sum of all estimated costs
- **Total Actual Spend**: Sum of all actual costs
- **Variance**: Difference between planned and actual
- **Item Count**: Number of expense items
- **Average Actual**: Average cost per item

**Screenshot Placeholder:** [Screenshot of expense summary dashboard with totals and statistics]

**Screenshot Placeholder:** [Screenshot showing expense list with all expense items in a table]

#### Editing an Expense

1. Find the expense item in the list

2. Click **"Edit"** or click on the expense row

3. Update the fields as needed

4. Click **"Save"** to update

**Screenshot Placeholder:** [Screenshot showing edit expense form with pre-filled values]

#### Deleting an Expense

1. Find the expense item in the list

2. Click **"Delete"** or the trash icon

3. Confirm the deletion

**Screenshot Placeholder:** [Screenshot showing delete confirmation dialog]

### 7.6 Using Budget Bot

Budget Bot is an AI-powered assistant that helps you analyze your event expenses and make informed financial decisions.

#### Opening Budget Bot

1. Navigate to an event's expense page

2. Look for the **"Ask Budget Bot"** button or chat icon

3. Click to open the Budget Bot panel

**Screenshot Placeholder:** [Screenshot of Budget Bot launcher]

#### Asking Questions

1. The Budget Bot panel will open showing:
   - Quick prompt suggestions
   - Chat interface
   - Input field

**Screenshot Placeholder:** [Screenshot of Budget Bot panel opened with quick prompts visible]

2. You can:
   - Click on a quick prompt (e.g., "What are my largest spending risks?")
   - Type your own question in the input field

3. Click **"Send"** or press Enter

4. Budget Bot will analyze your expense data and provide insights

**Example Questions:**
- "What are my largest spending risks?"
- "Which payments should I prioritize next?"
- "Explain the variance between planned and actual spend."
- "Summarize committed costs that still have 0 actual spend."
- "How much do I have left in my budget?"

**Screenshot Placeholder:** [Screenshot showing Budget Bot with a question typed in the input field]

**Screenshot Placeholder:** [Screenshot of Budget Bot conversation showing question and AI response]

#### Understanding Budget Bot Responses

Budget Bot provides:
- Analysis of spending patterns
- Risk identification
- Payment prioritization recommendations
- Variance explanations
- Budget status summaries

**Screenshot Placeholder:** [Screenshot showing Budget Bot response with detailed analysis and recommendations]

**Note:** Budget Bot requires a Gemini API key to be configured. If it's not working, contact your system administrator.

---

## 8. For Administrators

### 8.1 Admin Login

1. Click the **"Login"** button in the navigation bar

2. Select **"Admin Login"** or navigate to `/admin/login`

3. Enter your admin email and password

4. Click **"Login"**

**Note:** You must have an ADMIN role account.

**Screenshot Placeholder:** [Screenshot of admin login page]

### 8.2 Admin Dashboard

After logging in as an administrator, you'll see:

- System analytics and statistics
- Quick access to event management
- User management tools
- Recent activity overview

**Screenshot Placeholder:** [Screenshot of admin dashboard]

### 8.3 Managing Events

As an administrator, you can manage all events in the system.

#### Viewing All Events

1. From the admin dashboard, navigate to **"Events"** or **"All Events"**

2. You'll see a list of all events in the system

3. You can filter and search events

**Screenshot Placeholder:** [Screenshot of admin events list]

#### Creating Events

Follow the same steps as organizers (Section 7.3)

#### Editing Events

1. Find the event you want to edit

2. Click **"Edit"** or navigate to the event edit page

3. Update the event information

4. Click **"Save"** to update

**Screenshot Placeholder:** [Screenshot of event edit form]

#### Deleting Events

1. Find the event you want to delete

2. Click **"Delete"** or the trash icon

3. Confirm the deletion

**Warning:** Deleting an event will also delete all associated expenses and images.

### 8.4 Managing Users

#### Viewing Users

1. From the admin dashboard, navigate to **"Users"** or **"User Management"**

2. You'll see a list of all users in the system

3. Users are organized by role (ADMIN, ORGANIZER, USER)

**Screenshot Placeholder:** [Screenshot of user management page]

#### Viewing User Details

1. Click on a user in the list

2. View their:
   - Email address
   - Role
   - Account creation date
   - Associated events (if applicable)

**Screenshot Placeholder:** [Screenshot showing user details panel with all user information]

#### Updating User Role

1. Find the user you want to update

2. Click **"Edit Role"** or select from a dropdown

3. Choose the new role:
   - **USER**: Regular user
   - **ORGANIZER**: Event organizer
   - **ADMIN**: Administrator

4. Click **"Save"** to update

**Screenshot Placeholder:** [Screenshot of role update dropdown with role options]

**Screenshot Placeholder:** [Screenshot showing role update confirmation message]

#### Activating/Deactivating Users

1. Find the user you want to activate or deactivate

2. Click **"Activate"** or **"Deactivate"**

3. Confirm the action

**Note:** Deactivated users cannot log in to the system.

**Screenshot Placeholder:** [Screenshot showing user status toggle (Active/Suspended)]

**Screenshot Placeholder:** [Screenshot showing user status change confirmation]

#### Deleting Users

1. Find the user you want to delete

2. Click **"Delete"** or the trash icon

3. Confirm the deletion

**Warning:** Deleting a user will also delete all their bookmarks and associated data.

**Screenshot Placeholder:** [Screenshot showing delete user confirmation dialog with warning message]

### 8.5 Viewing System Analytics

1. From the admin dashboard, navigate to **"Analytics"** or view the dashboard overview

2. Analytics may include:
   - Total number of users
   - Total number of events
   - Total number of organizers
   - System usage statistics
   - Event categories distribution
   - Active vs upcoming events

**Screenshot Placeholder:** [Screenshot of analytics dashboard with charts and statistics]

**Screenshot Placeholder:** [Screenshot showing detailed analytics breakdown with graphs]

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Cannot Connect to the Application

**Problem:** The website doesn't load or shows a connection error.

**Solutions:**
1. Check that both backend and frontend servers are running
2. Verify the backend is running on port 4000
3. Verify the frontend is running on port 5173
4. Check your browser's console for error messages
5. Ensure your firewall isn't blocking the ports

#### Login Issues

**Problem:** Cannot log in with correct credentials.

**Solutions:**
1. Verify your email and password are correct
2. Check if your account is active (contact admin if needed)
3. Clear your browser cache and cookies
4. Try using a different browser
5. Check if you're using the correct login page (regular/organizer/admin)

#### Database Connection Errors

**Problem:** Backend shows database connection errors.

**Solutions:**
1. Verify PostgreSQL is running
2. Check your `.env` file has the correct `DATABASE_URL`
3. Ensure the database exists
4. Verify your database credentials are correct
5. Check that the schema has been created (run `schema.sql`)

#### Images Not Uploading

**Problem:** Event images fail to upload.

**Solutions:**
1. Check file size (ensure it's not too large)
2. Verify file format is supported (JPG, PNG, etc.)
3. Check that the `uploads` directory exists in `apps/backend`
4. Verify file permissions on the uploads directory
5. Check backend server logs for specific errors

#### Budget Bot Not Working

**Problem:** Budget Bot doesn't respond or shows errors.

**Solutions:**
1. Verify `GEMINI_API_KEY` is set in the backend `.env` file
2. Check that the API key is valid
3. Ensure you have internet connectivity
4. Check backend server logs for API errors
5. Budget Bot is only available for organizers and admins

#### Search Not Working

**Problem:** Search doesn't return results or shows errors.

**Solutions:**
1. Try refreshing the page
2. Clear your browser cache
3. Check your internet connection
4. Verify the backend server is running
5. Try a different search term

### 9.2 Obtaining Additional Support

If you encounter issues not addressed in this manual, follow these steps to obtain assistance:

1. **Browser Console Diagnostics**
   - Open the browser developer console (Press `F12` or right-click and select "Inspect")
   - Navigate to the "Console" tab
   - Review any error messages displayed
   - Note the error details for reporting purposes

2. **Server Log Analysis**
   - Access the backend server logs
   - Review error messages and stack traces
   - Document the timestamp and context of the error

3. **Contact System Administrator**
   - Report the issue with the following information:
     - Description of the problem
     - Steps to reproduce the issue
     - Error messages from browser console and server logs
     - Browser and operating system information

4. **Documentation Review**
   - Consult additional system documentation if available
   - Review release notes for known issues and workarounds

---

## 10. Reference

### 10.1 Keyboard Shortcuts

The following keyboard shortcuts are available throughout the EventStack interface:

| Key | Function |
|-----|----------|
| **Enter** | Submit forms, send messages in Budget Bot |
| **Escape** | Close modals, dialogs, and panels |
| **Tab** | Navigate between form fields sequentially |

### 10.2 Supported File Formats

#### Image Uploads

EventStack supports the following image file formats for event images:

| Format | Extensions | Notes |
|--------|------------|-------|
| JPEG | `.jpg`, `.jpeg` | Recommended for photographs |
| PNG | `.png` | Recommended for graphics with transparency |
| GIF | `.gif` | Supported for animated images |
| WebP | `.webp` | Modern format with excellent compression |

**File Size Limitations:**
- Maximum recommended file size: 10 MB per image
- Larger files may result in slower upload times

### 10.3 Browser Compatibility

EventStack has been tested and verified to work optimally with the following web browsers:

| Browser | Minimum Version | Recommended Version |
|---------|----------------|---------------------|
| Google Chrome | 90 | Latest stable release |
| Mozilla Firefox | 88 | Latest stable release |
| Microsoft Edge | 90 | Latest stable release |
| Safari | 14 | Latest stable release (macOS/iOS) |

**Note:** For optimal performance and feature compatibility, it is recommended to use the latest stable version of your preferred browser.

### 10.4 System Endpoints

When running EventStack in a local development environment, the following endpoints are available:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend Application** | `http://localhost:5173` | Main user interface |
| **Backend API** | `http://localhost:4000` | RESTful API server |
| **API Health Check** | `http://localhost:4000/api/health` | Service status verification |

### 10.5 Default System Accounts

When sample data is loaded during installation, the following test accounts are available:

| Role | Email Address | Purpose |
|------|---------------|---------|
| **Administrator** | `admin@eventstack.com` | Full system access (default password: `admin123`) |
| **Organizer** | `organizer@eventstack.com` | Event management capabilities |
| **Regular User** | `user1@example.com` | Standard user account |

**Security Notice:** Default account passwords should be changed immediately after initial setup. Contact your system administrator for access credentials if sample data was not loaded.

### 10.6 Configuration Reference

#### Backend Environment Variables

The following environment variables can be configured in the `apps/backend/.env` file:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | String | `development` | Runtime environment (development/test/production) |
| `PORT` | Integer | `4000` | Port number for the backend API server |
| `DATABASE_URL` | String | - | PostgreSQL connection string (required) |
| `JWT_SECRET` | String | - | Secret key for JWT token generation (minimum 6 characters) |
| `CORS_ORIGINS` | String | `http://localhost:5173` | Comma-separated list of allowed frontend origins |
| `GEMINI_API_KEY` | String | - | Google Gemini API key for Budget Bot functionality (optional) |

---

## 11. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | Development Team | Initial release |

---

## 12. Conclusion

This user manual provides comprehensive documentation for the EventStack event management platform. For additional support or to report issues, please contact your system administrator or refer to the project documentation.

**Document Status:** This manual reflects the current state of EventStack version 1.0.0 as of January 2025. The development team is committed to maintaining accurate and up-to-date documentation.

---

**End of Document**

