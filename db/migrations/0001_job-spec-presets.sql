CREATE TABLE `presets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`instructions` text NOT NULL,
	`sort` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presets_id` PRIMARY KEY(`id`),
	CONSTRAINT `presets_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `spec` json;
--> statement-breakpoint
INSERT INTO `presets` (`key`, `label`, `instructions`, `sort`) VALUES
('customer-update', 'Customer update', 'A 1:1 progress update for a specific customer. Direct, informative tone; no end-card CTA (default end card OFF). Standing spec still applies: 0.5s AI title card with Mo, persistent bilingual title bar, big bilingual subtitles (spoken language primary + Chinese), jump-cut pauses >0.8s, ducked music bed.', 1),
('expo-reel', 'Expo reel', 'A public channel reel from an expo visit with talking segments. Punchy bold-claim hook on the 0.5s AI title card, mint callouts on money features, end-card engagement CTA ("Comment for contact / more details") in the video language, cinematic bed ducked under speech.', 2),
('expo-walkthrough', 'Expo walkthrough', 'Mo walks the expo filming booths and products — mostly b-roll, little or no talking head. Speed walking/transit segments to 1.5-2.5x with music on top, cut dead hallway/door footage entirely, mint callouts on interesting booths/products, music-forward mix, subtitles only for any spoken parts, end-card CTA on.', 3),
('factory-tour', 'Factory tour', 'A factory/plant tour for buyers. Callouts on capacity, machinery and QC moments; speed transit segments 1.5-2.5x; short slow-mo on the key reveal; end-card CTA in the video language.', 4),
('talking-head', 'Talking head', 'Mo speaks to camera. Tighten speech aggressively (jump-cut pauses >0.8s), kinetic captions feel, minimal b-roll unless the job spec asks for it, bold-claim title card.', 5),
('product-demo', 'Product demo', 'Single-product showcase. Highlight close-ups and spec callouts, bold-claim title card, end-card CTA in the video language.', 6);