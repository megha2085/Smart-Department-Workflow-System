# Smart Department Workflow and Approval Management System

A full-stack web application that automates department request handling between Students, Mentors, and HOD with role-based access, request tracking, approvals, rejections, dashboard analytics, and notifications.

## Features

- User Registration & Login
- Role-Based Access Control
  - Student
  - Mentor
  - HOD
- Create Requests
- Multi-Level Approval Workflow
- Approve / Reject Requests
- Request Status Tracking
- Dashboard Analytics
- Notification System
- Secure Session Management

## Workflow

1. Student submits a request
2. Request goes to Mentor
3. Mentor can Approve or Reject
4. If approved, request moves to HOD
5. HOD can Approve or Reject
6. Student receives status notification

## Tech Stack

- Frontend: EJS, HTML, CSS, Bootstrap
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: Express Session, bcryptjs

## Project Structure

```text
server.js
package.json
models/
  Notification.js
views/
  dashboard.ejs
  login.ejs
  register.ejs
  notifications.ejs

Installation
Clone repository
git clone https://github.com/your-username/your-repo-name.git
Open folder
cd your-repo-name
Install dependencies
npm install
Start MongoDB
brew services start mongodb-community
Run project
node server.js
Open browser
http://localhost:3000
Future Improvements
Email Notifications
Real-Time Alerts
Admin Panel
File Uploads
Search & Filters
Mobile Responsive UI
Author

Megha Saxena

