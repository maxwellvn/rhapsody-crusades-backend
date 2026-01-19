/**
 * Migration script to move data from PHP JSON files to MongoDB
 *
 * Usage: npx ts-node scripts/migrate-data.ts
 *
 * Make sure to set MONGODB_URI environment variable or update it below
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rhapsody_crusades';

// Path to PHP backend data directory
const DATA_DIR = path.join(__dirname, '../../backend/data');

// Define schemas inline for migration
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  full_name: { type: String, required: true },
  phone: String,
  country: { type: String, required: true },
  city: String,
  zone: String,
  church: String,
  group: String,
  kingschat_username: String,
  avatar: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const EventSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  time: String,
  venue: { type: String, required: true },
  address: String,
  country: String,
  city: String,
  category: { type: String, default: 'Crusade' },
  image: String,
  capacity: Number,
  featured: { type: Boolean, default: false },
  created_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const TicketSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  event_id: { type: Number, required: true },
  qr_code: { type: String, required: true, unique: true },
  registration_date: { type: String, required: true },
  status: { type: String, enum: ['active', 'used', 'cancelled'], default: 'active' },
  checked_in_at: Date,
  checked_in_by: String,
  created_at: { type: Date, default: Date.now },
});

const TestimonySchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  text: { type: String, required: true },
  event_id: Number,
  category_id: Number,
  image: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  likes: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const TestimonyCategorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  icon: { type: String, required: true },
  color: { type: String, required: true },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const NotificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  type: { type: String, enum: ['system', 'event', 'registration', 'testimony', 'ticket'], default: 'system' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  read_by: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
});

const EventStaffSchema = new mongoose.Schema({
  event_id: { type: Number, required: true },
  user_id: { type: String, required: true },
  role: { type: String, enum: ['checker', 'coordinator', 'usher', 'other'], default: 'checker' },
  added_at: { type: Date, default: Date.now },
  added_by: { type: String, required: true },
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'admin' },
  created_at: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', UserSchema);
const Event = mongoose.model('Event', EventSchema);
const Ticket = mongoose.model('Ticket', TicketSchema);
const Testimony = mongoose.model('Testimony', TestimonySchema);
const TestimonyCategory = mongoose.model('TestimonyCategory', TestimonyCategorySchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const EventStaff = mongoose.model('EventStaff', EventStaffSchema);
const Admin = mongoose.model('Admin', AdminSchema);

// Helper to read JSON file
function readJsonFile(filename: string): unknown[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filename}`);
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.log(`  Error reading ${filename}:`, error);
    return [];
  }
}

// ID mapping from old hex IDs to new MongoDB ObjectIds
const userIdMap = new Map<string, mongoose.Types.ObjectId>();

async function migrateUsers() {
  console.log('\nMigrating users...');
  const users = readJsonFile('users.json') as Array<{
    id: string;
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    country: string;
    city?: string;
    zone?: string;
    church?: string;
    group?: string;
    kingschat_username?: string;
    avatar?: string;
    created_at?: string;
    updated_at?: string;
  }>;

  for (const user of users) {
    try {
      const newUser = await User.create({
        email: user.email?.toLowerCase(),
        password: user.password,
        full_name: user.full_name,
        phone: user.phone,
        country: user.country,
        city: user.city,
        zone: user.zone,
        church: user.church,
        group: user.group,
        kingschat_username: user.kingschat_username,
        avatar: user.avatar,
        created_at: user.created_at ? new Date(user.created_at) : new Date(),
        updated_at: user.updated_at ? new Date(user.updated_at) : new Date(),
      });

      // Store ID mapping
      userIdMap.set(user.id, newUser._id as mongoose.Types.ObjectId);
      console.log(`  Migrated user: ${user.email}`);
    } catch (error) {
      console.log(`  Error migrating user ${user.email}:`, error);
    }
  }

  console.log(`  Total users migrated: ${userIdMap.size}`);
}

async function migrateEvents() {
  console.log('\nMigrating events...');
  const events = readJsonFile('events.json') as Array<{
    id: number;
    title: string;
    description: string;
    date: string;
    time?: string;
    venue: string;
    address?: string;
    country?: string;
    city?: string;
    category?: string;
    image?: string;
    capacity?: number;
    featured?: boolean;
    created_by: string;
    created_at?: string;
  }>;

  let count = 0;
  for (const event of events) {
    try {
      // Map old user ID to new one
      const newCreatedBy = userIdMap.get(event.created_by)?.toHexString() || event.created_by;

      await Event.create({
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        venue: event.venue,
        address: event.address,
        country: event.country,
        city: event.city,
        category: event.category || 'Crusade',
        image: event.image,
        capacity: event.capacity,
        featured: event.featured || false,
        created_by: newCreatedBy,
        created_at: event.created_at ? new Date(event.created_at) : new Date(),
      });

      count++;
      console.log(`  Migrated event: ${event.title}`);
    } catch (error) {
      console.log(`  Error migrating event ${event.title}:`, error);
    }
  }

  console.log(`  Total events migrated: ${count}`);
}

async function migrateTickets() {
  console.log('\nMigrating tickets...');
  const tickets = readJsonFile('tickets.json') as Array<{
    id: string;
    user_id: string;
    event_id: number;
    qr_code: string;
    registration_date: string;
    status: string;
    checked_in_at?: string;
    checked_in_by?: string;
    created_at?: string;
  }>;

  let count = 0;
  for (const ticket of tickets) {
    try {
      // Map old user IDs to new ones
      const newUserId = userIdMap.get(ticket.user_id)?.toHexString() || ticket.user_id;
      const newCheckedInBy = ticket.checked_in_by
        ? userIdMap.get(ticket.checked_in_by)?.toHexString() || ticket.checked_in_by
        : undefined;

      await Ticket.create({
        user_id: newUserId,
        event_id: ticket.event_id,
        qr_code: ticket.qr_code,
        registration_date: ticket.registration_date,
        status: ticket.status || 'active',
        checked_in_at: ticket.checked_in_at ? new Date(ticket.checked_in_at) : undefined,
        checked_in_by: newCheckedInBy,
        created_at: ticket.created_at ? new Date(ticket.created_at) : new Date(),
      });

      count++;
    } catch (error) {
      console.log(`  Error migrating ticket:`, error);
    }
  }

  console.log(`  Total tickets migrated: ${count}`);
}

async function migrateTestimonies() {
  console.log('\nMigrating testimonies...');
  const testimonies = readJsonFile('testimonies.json') as Array<{
    id: string;
    user_id: string;
    title: string;
    text: string;
    event_id?: number;
    category_id?: number;
    image?: string;
    status: string;
    likes?: string[];
    created_at?: string;
    updated_at?: string;
  }>;

  let count = 0;
  for (const testimony of testimonies) {
    try {
      // Map old user IDs to new ones
      const newUserId = userIdMap.get(testimony.user_id)?.toHexString() || testimony.user_id;
      const newLikes = (testimony.likes || []).map((id) => userIdMap.get(id)?.toHexString() || id);

      await Testimony.create({
        user_id: newUserId,
        title: testimony.title,
        text: testimony.text,
        event_id: testimony.event_id,
        category_id: testimony.category_id,
        image: testimony.image,
        status: testimony.status || 'pending',
        likes: newLikes,
        created_at: testimony.created_at ? new Date(testimony.created_at) : new Date(),
        updated_at: testimony.updated_at ? new Date(testimony.updated_at) : new Date(),
      });

      count++;
    } catch (error) {
      console.log(`  Error migrating testimony:`, error);
    }
  }

  console.log(`  Total testimonies migrated: ${count}`);
}

async function migrateTestimonyCategories() {
  console.log('\nMigrating testimony categories...');
  const categories = readJsonFile('testimony_categories.json') as Array<{
    id: number;
    name: string;
    slug: string;
    description?: string;
    icon: string;
    color: string;
    order?: number;
    active?: boolean;
  }>;

  let count = 0;
  for (const category of categories) {
    try {
      await TestimonyCategory.create({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        color: category.color,
        order: category.order || 0,
        active: category.active !== false,
      });

      count++;
      console.log(`  Migrated category: ${category.name}`);
    } catch (error) {
      console.log(`  Error migrating category ${category.name}:`, error);
    }
  }

  console.log(`  Total categories migrated: ${count}`);
}

async function migrateNotifications() {
  console.log('\nMigrating notifications...');
  const notifications = readJsonFile('notifications.json') as Array<{
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    read_by?: string[];
    created_at?: string;
  }>;

  let count = 0;
  for (const notification of notifications) {
    try {
      // Map old user IDs to new ones
      const newUserId =
        notification.user_id === 'all'
          ? 'all'
          : userIdMap.get(notification.user_id)?.toHexString() || notification.user_id;
      const newReadBy = (notification.read_by || []).map((id) => userIdMap.get(id)?.toHexString() || id);

      await Notification.create({
        user_id: newUserId,
        type: notification.type || 'system',
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read_by: newReadBy,
        created_at: notification.created_at ? new Date(notification.created_at) : new Date(),
      });

      count++;
    } catch (error) {
      console.log(`  Error migrating notification:`, error);
    }
  }

  console.log(`  Total notifications migrated: ${count}`);
}

async function migrateEventStaff() {
  console.log('\nMigrating event staff...');
  const staffList = readJsonFile('event_staff.json') as Array<{
    id: string;
    event_id: number;
    user_id: string;
    role: string;
    added_at?: string;
    added_by: string;
  }>;

  let count = 0;
  for (const staff of staffList) {
    try {
      // Map old user IDs to new ones
      const newUserId = userIdMap.get(staff.user_id)?.toHexString() || staff.user_id;
      const newAddedBy = userIdMap.get(staff.added_by)?.toHexString() || staff.added_by;

      await EventStaff.create({
        event_id: staff.event_id,
        user_id: newUserId,
        role: staff.role || 'checker',
        added_at: staff.added_at ? new Date(staff.added_at) : new Date(),
        added_by: newAddedBy,
      });

      count++;
    } catch (error) {
      console.log(`  Error migrating staff:`, error);
    }
  }

  console.log(`  Total staff migrated: ${count}`);
}

async function migrateAdmins() {
  console.log('\nMigrating admins...');
  const admins = readJsonFile('admins.json') as Array<{
    id: string;
    username: string;
    password: string;
    name: string;
    role?: string;
    created_at?: string;
  }>;

  let count = 0;
  for (const admin of admins) {
    try {
      await Admin.create({
        username: admin.username,
        password: admin.password,
        name: admin.name,
        role: admin.role || 'admin',
        created_at: admin.created_at ? new Date(admin.created_at) : new Date(),
      });

      count++;
      console.log(`  Migrated admin: ${admin.username}`);
    } catch (error) {
      console.log(`  Error migrating admin ${admin.username}:`, error);
    }
  }

  console.log(`  Total admins migrated: ${count}`);
}

async function main() {
  console.log('='.repeat(50));
  console.log('Rhapsody Crusades Data Migration');
  console.log('='.repeat(50));
  console.log(`\nData directory: ${DATA_DIR}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);

  // Check if data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`\nError: Data directory not found: ${DATA_DIR}`);
    console.log('Make sure the PHP backend data folder exists at the expected path.');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Run migrations in order (users first for ID mapping)
    await migrateUsers();
    await migrateEvents();
    await migrateTickets();
    await migrateTestimonies();
    await migrateTestimonyCategories();
    await migrateNotifications();
    await migrateEventStaff();
    await migrateAdmins();

    console.log('\n' + '='.repeat(50));
    console.log('Migration completed successfully!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

main();
