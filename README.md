#  Car Wash Management System - Mobile App

A production-ready mobile application built with **React Native** and **Expo** for managing daily car wash operations. The application provides staff and business owners with a secure, real-time platform to manage customers, vehicles, jobs, payments, and business performance from anywhere.

The mobile application communicates with a Django REST Framework backend through secure REST APIs.

---

# Overview

The Smart Car Wash mobile application was designed to digitize car wash operations by replacing manual record-keeping with a modern mobile solution. Staff can efficiently manage service jobs while business owners gain real-time visibility into operations, sales, and staff performance.

---

# Features

## Authentication

- Secure Login
- JWT Authentication
- Role-Based Access Control
- Persistent Sessions
- Secure Logout

---

## Dashboard

- Daily Revenue
- Jobs Summary
- Pending Jobs
- Completed Jobs
- Staff Activity
- Quick Actions

---

## Customer Management

- Register Customers
- Search Customers
- Customer History
- Contact Information

---

## Vehicle Management

- Register Vehicles
- Vehicle Types
- Plate Number Tracking
- Customer-Vehicle Association

---

## Job Management

- Create Service Jobs
- Assign Staff
- Track Job Status
- Update Job Progress
- Complete Jobs
- Job History

---

## Service Management

- Service Categories
- Vehicle-Based Pricing
- Service Selection
- Dynamic Pricing

---

## Payments

- Cash Payments
- M-Pesa Payments
- M-Pesa STK Push
- Manual M-Pesa Verification
- Payment History
- Transaction Status

---

## Reporting

- Daily Sales
- Revenue Reports
- Staff Performance
- Customer Reports
- Service Reports

---

## Owner Features

- Business Dashboard
- User Management
- Revenue Analytics
- Staff Management
- Branch Management
- Reports

---

## Staff Features

- Assigned Jobs
- Daily Tasks
- Job Updates
- Personal Performance

---

# Technology Stack

## Mobile

- React Native
- Expo
- JavaScript / TypeScript

## State Management

- React Context API
- Hooks

## Networking

- Axios
- REST APIs

## Backend

- Django REST Framework

## Authentication

- JWT Authentication

---

# Application Architecture

```
                    React Native App
                           │
                           │ REST API
                           ▼
              Django REST Framework
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   PostgreSQL         M-Pesa APIs      Business Logic
```

---

# Project Structure

```
src/
│
├── app/
├── api/
├── assets/
├── components/
├── constants/
├── contexts/
├── hooks/
├── screens/
├── services/
├── store/
├── types/
├── utils/
│
├── App.tsx
└── package.json
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/carwash-mobile.git

cd carwash-mobile
```

---

## Install Dependencies

```bash
npm install
```

or

```bash
yarn install
```

---

## Configure Environment Variables

Create a `.env` file.

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Start Development Server

```bash
npx expo start
```

---

## Android

```bash
npx expo run:android
```

---

## iOS

```bash
npx expo run:ios
```

---

# Security

- JWT Authentication
- Secure API Communication
- Protected Routes
- Role-Based Access Control
- Environment Variables
- Secure Token Storage

---

# Performance Optimizations

- Lazy Loading
- Optimized API Requests
- Reusable Components
- Efficient State Management
- Image Optimization
- Optimized Rendering

---

# Production Features

- Production-ready Architecture
- Role-Based Access Control
- Payment Integration
- Real-Time Job Tracking
- Mobile-first User Experience
- Scalable Component Architecture

---

# Future Enhancements

- Push Notifications
- Offline Support
- QR Code Job Tracking
- Barcode Scanning
- Customer Self-Service Portal
- Loyalty Program
- AI Business Insights
- GPS Navigation
- Multi-Branch Management

---

# Screenshots

Screenshots of the application will be added here.

---

# Backend

This application integrates with the **Smart Car Wash Management Backend** built using:

- Django
- Django REST Framework
- PostgreSQL
- JWT Authentication
- M-Pesa Daraja API

---

# Author

**Elijah Kiragu**

Senior Full Stack Software Engineer

**Specializations**

- Python
- Django
- React
- React Native
- AI
- IoT
- DevOps

LinkedIn

https://www.linkedin.com/in/elijah-kiragu-366720227

---

# License

This project is proprietary software developed for production use.

The source code is confidential and may not be copied, modified, distributed, or used without prior written permission from the author.
