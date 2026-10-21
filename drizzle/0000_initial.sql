CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`document_json` text NOT NULL,
	`plain_text` text DEFAULT '' NOT NULL,
	`collection` text DEFAULT 'Personal' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_updated_at_idx` ON `notes` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `notes_collection_idx` ON `notes` (`collection`);
--> statement-breakpoint
CREATE TABLE `annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`quote` text NOT NULL,
	`prefix` text DEFAULT '' NOT NULL,
	`suffix` text DEFAULT '' NOT NULL,
	`editor_position` integer NOT NULL,
	`comment` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `annotations_note_id_idx` ON `annotations` (`note_id`);
--> statement-breakpoint
CREATE VIRTUAL TABLE `notes_fts` USING fts5(`note_id` UNINDEXED, `title`, `body`, tokenize='unicode61 remove_diacritics 2');
--> statement-breakpoint
CREATE TRIGGER `notes_fts_insert` AFTER INSERT ON `notes` BEGIN
  INSERT INTO `notes_fts` (`note_id`, `title`, `body`) VALUES (new.`id`, new.`title`, new.`plain_text`);
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_update` AFTER UPDATE ON `notes` BEGIN
  DELETE FROM `notes_fts` WHERE `note_id` = old.`id`;
  INSERT INTO `notes_fts` (`note_id`, `title`, `body`) VALUES (new.`id`, new.`title`, new.`plain_text`);
END;
--> statement-breakpoint
CREATE TRIGGER `notes_fts_delete` AFTER DELETE ON `notes` BEGIN
  DELETE FROM `notes_fts` WHERE `note_id` = old.`id`;
END;
