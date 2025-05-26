// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee' | 'client';
  avatar?: string;
}

export interface Admin extends User {
  role: 'admin';
}

export interface Employee extends User {
  role: 'employee';
  specialization?: string;
  contactNumber?: string;
  accessCode: string;
}

export interface Client extends User {
  role: 'client';
  contactNumber?: string;
  address?: string;
}

// Product related types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sku: string;
  stock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

// Project related types
export interface Project {
  id: string;
  title: string;
  description: string;
  clientId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  quote?: number;
  assignedEmployees: string[]; // Employee IDs
  visits: Visit[];
  products: ProjectProduct[];
}

export interface ProjectProduct {
  productId: string;
  quantity: number;
  price: number;
}

export interface Visit {
  id: string;
  projectId: string;
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  assignedEmployees: string[]; // Employee IDs
}

// Chat related types
export interface Message {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// Notification related types
export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  type: 'visit_scheduled' | 'visit_rescheduled' | 'visit_cancelled' | 'project_update' | 'message';
  relatedId?: string; // Project ID or Visit ID
}