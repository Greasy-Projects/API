import {
	mysqlTable,
	AnyMySqlColumn,
	unique,
	varchar,
	datetime,
	text,
	mysqlEnum,
} from "drizzle-orm/mysql-core";

export const sessions = mysqlTable(
	"sessions",
	{
		id: varchar("id", { length: 100 }).notNull(),
		userId: varchar("user_id", { length: 100 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		token: varchar("token", { length: 255 }).notNull(),
		expiresAt: datetime("expires_at", { mode: "string" }).notNull(),
	},
	table => {
		return {
			sessionsTokenUnique: unique("sessions_token_unique").on(table.token),
		};
	}
);

export const users = mysqlTable(
	"users",
	{
		id: varchar("id", { length: 100 }).notNull(),
		primaryAccountId: varchar("primary_account_id", { length: 100 })
			.notNull()
			.references((): AnyMySqlColumn => userAccounts.id, {
				onDelete: "cascade",
				onUpdate: "restrict",
			}),
		createdAt: datetime("created_at", { mode: "string" }).notNull(),
		updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
		scope: varchar("scope", { length: 255 }).default("group:default"),
	},
	table => {
		return {
			usersPrimaryAccountIdUnique: unique("users_primary_account_id_unique").on(
				table.primaryAccountId
			),
		};
	}
);

export const userAccounts = mysqlTable("user_accounts", {
	id: varchar("id", { length: 100 }).notNull(),
	username: text("username").notNull(),
	displayName: text("display_name").notNull(),
	email: varchar("email", { length: 255 }).default("NULL"),
	avatar: varchar("avatar", { length: 255 }).default("NULL"),
	userId: varchar("user_id", { length: 100 })
		.default("NULL")
		.references((): AnyMySqlColumn => users.id, {
			onDelete: "cascade",
			onUpdate: "restrict",
		}),
	platform: mysqlEnum("platform", ["twitch", "discord"]).notNull(),
	scope: varchar("scope", { length: 255 }).notNull(),
	accessToken: varchar("access_token", { length: 100 }).default("NULL"),
	refreshToken: varchar("refresh_token", { length: 100 }).default("NULL"),
	expiresAt: datetime("expires_at", { mode: "string" }).notNull(),
	createdAt: datetime("created_at", { mode: "string" }).notNull(),
	updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
});
