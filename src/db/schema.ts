import {
	pgTable,
	varchar,
	text,
	timestamp,
	type AnyPgColumn,
	boolean,
	integer,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

const lengthOf = {
	id: 100,
};

const createdUpdated = {
	createdAt: timestamp("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: timestamp("updated_at")
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
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

export const accounts = pgTable("user_accounts", {
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
	}).references((): AnyPgColumn => users.id, {
		onDelete: "cascade",
		onUpdate: "restrict",
	}),
	platform: varchar("platform", { length: 255 })
		.$type<"twitch" | "discord">()
		.notNull(),
	scope: varchar("scope", {
		length: 255,
	}).notNull(),
	accessToken: varchar("access_token", {
		length: 100,
	}).notNull(),
	refreshToken: varchar("refresh_token", {
		length: 100,
	}).notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	...createdUpdated,
});
export const minecraftUsers = pgTable("minecraft_users", {
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
export const sessions = pgTable("sessions", {
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
	expiresAt: timestamp("expires_at").notNull(),
});

export const watchtime = pgTable(
	"watchtime",
	{
		id: uuid("id")
			.primaryKey()
			.defaultRandom(),
		twitchId: varchar("twitch_id", {
			length: lengthOf.id,
		}).notNull(),
		time: integer("time").notNull().default(0),
		date: timestamp("date").notNull(),
		updatedAt: timestamp("updated_at").notNull(),
	},
	t => ({
		unq: unique().on(t.twitchId, t.date),
	})
);

// // TODO: logs table
// export const logs = pgTable(
//   "logs",
//   {
//     id: varchar("id", {
//       length: 100,
//     })
//       .primaryKey()
//       .$defaultFn(() => createId()),
//     createdAt: timestamp("created_at")
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
