import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, real, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Users & Orgs ---
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  name: text('name').notNull(),
  roles: jsonb('roles').default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'owner', 'epc', 'financier', 'supplier'
  status: text('status').notNull().default('ACTIVE'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Portfolios ---
export const portfolios = pgTable('portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  projectIds: jsonb('project_ids').default('[]'),
  assetIds: jsonb('asset_ids').default('[]'),
  settings: jsonb('settings'),
  stalledThresholdDays: integer('stalled_threshold_days'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Projects ---
export const energyProjects = pgTable('energy_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  status: text('status').notNull(),
  projectType: text('project_type'),
  targetCapacityKw: integer('target_capacity_kw'),
  estimatedBudgetIRR: doublePrecision('estimated_budget_irr'),
  location: jsonb('location'),
  site: jsonb('site'),
  energyRequirement: jsonb('energy_requirement'),
  stalledThresholdDays: integer('stalled_threshold_days'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: text('role').notNull(),
  status: text('status').default('ACTIVE'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const projectActivities = pgTable('project_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id).notNull(),
  eventType: text('event_type').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Assets ---
export const energyAssets = pgTable('energy_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetCode: text('asset_code').notNull(),
  name: text('name').notNull(),
  projectId: uuid('project_id').references(() => energyProjects.id),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  epcId: uuid('epc_id').references(() => organizations.id),
  status: text('status').notNull(), // 'COMMISSIONED', 'OPERATIONAL', 'UNDER_MAINTENANCE'
  capacityKw: integer('capacity_kw').notNull(),
  location: jsonb('location'),
  commercialOperationDate: timestamp('commercial_operation_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const assetComponents = pgTable('asset_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').references(() => energyAssets.id).notNull(),
  componentType: text('component_type').notNull(),
  brand: text('brand'),
  model: text('model'),
  serialNumber: text('serial_number'),
  capacity: real('capacity'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Telemetry & Monitoring ---
export const telemetrySources = pgTable('telemetry_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').references(() => energyAssets.id).notNull(),
  sourceType: text('source_type').notNull(),
  protocol: text('protocol').notNull(),
  status: text('status').notNull(),
  credentials: jsonb('credentials'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const telemetryReadings = pgTable('telemetry_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').references(() => telemetrySources.id).notNull(),
  assetId: uuid('asset_id').references(() => energyAssets.id).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  parameter: text('parameter').notNull(),
  value: doublePrecision('value').notNull(),
  unit: text('unit'),
});

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').references(() => energyAssets.id).notNull(),
  severity: text('severity').notNull(),
  category: text('category').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull(), // 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

// --- Execution & Contracts ---
export const projectContracts = pgTable('project_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  contractType: text('contract_type').notNull(),
  status: text('status').notNull(),
  totalValueIRR: doublePrecision('total_value_irr'),
  signedDocumentUrl: text('signed_document_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Financing ---
export const financingRequests = pgTable('financing_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  status: text('status').notNull(),
  requestedAmount: doublePrecision('requested_amount'),
  ownerEquity: doublePrecision('owner_equity'),
  totalProjectCost: doublePrecision('total_project_cost'),
  readinessScore: integer('readiness_score'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const financingOffers = pgTable('financing_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  financingRequestId: uuid('financing_request_id').references(() => financingRequests.id).notNull(),
  financialPartnerProfileId: uuid('financial_partner_profile_id').notNull(),
  status: text('status').notNull(),
  offeredAmount: doublePrecision('offered_amount').notNull(),
  interestRate: doublePrecision('interest_rate').notNull(),
  tenorMonths: integer('tenor_months').notNull(),
  terms: jsonb('terms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Procurement ---
export const procurementPackages = pgTable('procurement_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  title: text('title').notNull(),
  status: text('status').notNull(),
  budget: doublePrecision('budget'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => energyProjects.id).notNull(),
  supplierId: uuid('supplier_id').references(() => organizations.id).notNull(),
  packageId: uuid('package_id').references(() => procurementPackages.id),
  status: text('status').notNull(),
  totalAmount: doublePrecision('total_amount').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Defining Relations
export const energyProjectsRelations = relations(energyProjects, ({ many, one }) => ({
  members: many(projectMembers),
  contracts: many(projectContracts),
  financingRequests: many(financingRequests),
  assets: many(energyAssets),
  owner: one(users, {
    fields: [energyProjects.ownerId],
    references: [users.id],
  }),
}));
