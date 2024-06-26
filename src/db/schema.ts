import {
	mysqlTable,
	varchar,
	text,
	datetime,
	mysqlEnum,
	AnyMySqlColumn,
	boolean,
	int,
	unique,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

const lengthOf = {
	id: 100,
};

const createdUpdated = {
	createdAt: datetime("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: datetime("updated_at")
		.notNull()
		.$onUpdate(() => new Date()),
};

export const users = mysqlTable("users", {
	id: varchar("id", {
		length: lengthOf.id,
	})
		.primaryKey()
		.$defaultFn(() => createId()),
	scope: varchar("scope", {
		length: 255,
	}).default("group:default"),
	primaryAccountId: varchar("primary_account_id", {
		length: lengthOf.id,
	})
		.notNull()
		.unique()
		.references(() => accounts.id, {
			onDelete: "cascade",
			onUpdate: "restrict",
		}),
	...createdUpdated,
});

export const accounts = mysqlTable("user_accounts", {
	id: varchar("id", {
		length: lengthOf.id,
	}).primaryKey(),
	username: text("username").notNull(),
	displayName: text("display_name").notNull(),
	email: varchar("email", {
		length: 255,
	}),
	avatar: varchar("avatar", { length: 255 }),
	userId: varchar("user_id", {
		length: lengthOf.id,
	}).references((): AnyMySqlColumn => users.id, {
		onDelete: "cascade",
		onUpdate: "restrict",
	}),
	platform: mysqlEnum("platform", ["twitch", "discord"]).notNull(),
	scope: varchar("scope", {
		length: 255,
	}).notNull(),
	accessToken: varchar("access_token", {
		length: 100,
	}).notNull(),
	refreshToken: varchar("refresh_token", {
		length: 100,
	}).notNull(),
	expiresAt: datetime("expires_at").notNull(),
	...createdUpdated,
});
export const minecraftUsers = mysqlTable("minecraft_users", {
	id: varchar("id", {
		length: 36,
	})
		.primaryKey()
		.unique(),
	userId: varchar("user_id", {
		length: lengthOf.id,
	})
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	whitelisted: boolean("whitelisted").default(true),
	...createdUpdated,
});
export const sessions = mysqlTable("sessions", {
	id: varchar("id", {
		length: lengthOf.id,
	})
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: varchar("user_id", {
		length: lengthOf.id,
	})
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	token: varchar("token", {
		length: 255,
	})
		.notNull()
		.unique(),
	expiresAt: datetime("expires_at").notNull(),
});

export const watchtime = mysqlTable(
	"watchtime",
	{
		id: varchar("id", {
			length: lengthOf.id,
		})
			.primaryKey()
			.$defaultFn(() => createId()),
		twitchId: varchar("twitch_id", {
			length: lengthOf.id,
		}).notNull(),
		time: int("time"),
		date: datetime("date").notNull(),
		updatedAt: datetime("updated_at").notNull(),
	},
	t => ({
		unq: unique().on(t.twitchId, t.date),
	})
);

// // TODO: logs table
// export const logs = mysqlTable(
//   "logs",
//   {
//     id: varchar("id", {
//       length: 100,
//     })
//       .primaryKey()
//       .$defaultFn(() => createId()),
//     createdAt: datetime("created_at")
//       .notNull()
//       .$defaultFn(() => new Date()),
//     userId: varchar("user_id", {
//         length: 100,
//       }).notNull(),
//     message: text("message"),

//     tags:
//   },
//   (table) => {
//   return {
//     userIdIdx:  index("user_id_idx").on(table.userId),
//     createdAtIdx:   index("created_at_idx").on(table.createdAt),
//     //tags
//   }
//   }
// );
