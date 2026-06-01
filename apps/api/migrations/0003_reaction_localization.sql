ALTER TABLE reaction_videos
  ADD COLUMN description TEXT;

ALTER TABLE reaction_videos
  ADD COLUMN localized_title TEXT;

ALTER TABLE reaction_videos
  ADD COLUMN localized_title_source TEXT
    CHECK (localized_title_source IN ('youtube_localized', 'machine'));

ALTER TABLE reaction_videos
  ADD COLUMN localized_description TEXT;

ALTER TABLE reaction_videos
  ADD COLUMN localized_description_source TEXT
    CHECK (localized_description_source IN ('youtube_localized', 'machine'));
