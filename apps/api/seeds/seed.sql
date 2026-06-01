DELETE FROM app_settings;
DELETE FROM ranking_snapshots;
DELETE FROM reaction_videos;
DELETE FROM channels;
DELETE FROM contents;
DELETE FROM categories;

INSERT INTO categories (id, slug, name_ko, sort_order, is_active) VALUES
  (1, 'movie', '영화', 1, 1),
  (2, 'drama', '드라마', 2, 1),
  (3, 'webtoon', '만화', 3, 1),
  (4, 'music', '노래', 4, 1);

INSERT INTO contents (
  id,
  category_id,
  slug,
  title_ko,
  title_en,
  aliases_json,
  release_year,
  thumbnail_url,
  description,
  status,
  created_at,
  updated_at
) VALUES
  (1, 1, 'extreme-job', '극한직업', 'Extreme Job', '["Extreme Job", "극한직업 reaction", "Korean comedy movie"]', 2019, NULL, '해외 유튜브에서 반응이 빠르게 늘고 있는 코미디 영화', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (2, 2, 'new-journey-to-the-west', '신서유기', 'New Journey to the West', '["신서유기 reaction", "New Journey to the West"]', 2015, NULL, '예능성 포인트를 좋아하는 해외 채널 반응이 빠른 콘텐츠', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (3, 4, 'apt', 'APT.', 'APT.', '["APT reaction", "Rose Bruno Mars APT"]', 2024, NULL, '뮤직비디오와 라이브 클립 기반 리액션이 많은 대표 트랙', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (4, 3, 'solo-leveling', '나 혼자만 레벨업', 'Solo Leveling', '["Solo Leveling reaction", "나 혼자만 레벨업"]', 2018, NULL, '애니화 이후 해외 리액션 수집 가치가 높은 대표 IP', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (5, 1, 'parasite', '기생충', 'Parasite', '["Parasite reaction", "기생충 review"]', 2019, NULL, '분석형 리뷰와 첫 감상 영상이 꾸준히 쌓이는 작품', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (6, 4, 'queen-of-tears-ost', '드라마 OST 메들리', 'K-Drama OST Medley', '["K drama OST reaction", "드라마 OST"]', 2025, NULL, '음악 카테고리 내 드라마 연계 반응 실험용 데이터', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (7, 2, 'squid-game-2', '오징어게임 S2', 'Squid Game Season 2', '["Squid Game Season 2 reaction", "오징어게임 시즌2"]', 2026, NULL, '최신순과 인기순 모두 강한 글로벌 반응 콘텐츠', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (8, 2, 'guardian', '도깨비', 'Guardian: The Lonely and Great God', '["Goblin reaction", "도깨비 reaction"]', 2016, NULL, '클래식 드라마 리액션 확보용 기준 콘텐츠', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (9, 4, 'bokmyeon-song', '복면가왕 레전드 무대', 'King of Mask Singer Highlights', '["King of Mask Singer reaction", "복면가왕 reaction"]', 2025, NULL, '예능형 음악 반응을 담기 위한 시드 카드', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (10, 3, 'marvel-webtoon', '마블 코믹스', 'Marvel Comics in Korean Translation', '["Marvel Comics reaction", "웹툰 리뷰"]', 2024, NULL, '콘텐츠 분류 구조 테스트용 시드 데이터', 'active', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z');

INSERT INTO channels (
  id,
  youtube_channel_id,
  title,
  country_code,
  default_language,
  is_korean_channel
) VALUES
  (1, 'UC-REACTKING', 'ReactKing', 'US', 'en', 0),
  (2, 'UC-FILMREACT', 'FilmReact', 'US', 'en', 0),
  (3, 'UC-WATCHKOREA', 'WatchKorea', 'CA', 'en', 0),
  (4, 'UC-MOVIEVERSE', 'MovieVerse', 'GB', 'en', 0),
  (5, 'UC-KPOP-ROOM', 'Kpop Room', 'PH', 'en', 0),
  (6, 'UC-GLOBALDRAMA', 'GlobalDrama', 'BR', 'pt', 0);

INSERT INTO reaction_videos (
  id,
  youtube_video_id,
  content_id,
  channel_id,
  title,
  thumbnail_url,
  published_at,
  view_count,
  like_count,
  comment_count,
  detected_language,
  is_overseas_reaction,
  youtube_url,
  created_at,
  updated_at
) VALUES
  (1, 'react-001', 1, 1, '극한직업 보고 충격받은 미국인 반응', NULL, '2026-05-30T00:00:00.000Z', 312000, 21000, 1400, 'en', 1, 'https://www.youtube.com/watch?v=react-001', '2026-05-30T00:00:00.000Z', '2026-05-30T00:00:00.000Z'),
  (2, 'react-002', 1, 2, 'Americans watch Extreme Job for the first time', NULL, '2026-05-29T20:00:00.000Z', 208000, 15600, 970, 'en', 1, 'https://www.youtube.com/watch?v=react-002', '2026-05-29T20:00:00.000Z', '2026-05-29T20:00:00.000Z'),
  (3, 'react-003', 1, 3, '이 영화 진짜임? | 극한직업 리액션', NULL, '2026-05-29T12:30:00.000Z', 177000, 12000, 830, 'en', 1, 'https://www.youtube.com/watch?v=react-003', '2026-05-29T12:30:00.000Z', '2026-05-29T12:30:00.000Z'),
  (4, 'react-004', 2, 6, '신서유기 처음 본 브라질 채널의 반응', NULL, '2026-05-30T02:00:00.000Z', 96000, 7400, 520, 'pt', 1, 'https://www.youtube.com/watch?v=react-004', '2026-05-30T02:00:00.000Z', '2026-05-30T02:00:00.000Z'),
  (5, 'react-005', 3, 5, 'APT. MV reaction and vocal breakdown', NULL, '2026-05-30T05:00:00.000Z', 540000, 39000, 2200, 'en', 1, 'https://www.youtube.com/watch?v=react-005', '2026-05-30T05:00:00.000Z', '2026-05-30T05:00:00.000Z'),
  (6, 'react-006', 4, 2, 'Solo Leveling Episode 1 reaction', NULL, '2026-05-29T23:45:00.000Z', 130000, 11200, 640, 'en', 1, 'https://www.youtube.com/watch?v=react-006', '2026-05-29T23:45:00.000Z', '2026-05-29T23:45:00.000Z'),
  (7, 'react-007', 5, 4, 'Parasite ending explained by US critic', NULL, '2026-05-29T18:30:00.000Z', 280000, 17300, 1200, 'en', 1, 'https://www.youtube.com/watch?v=react-007', '2026-05-29T18:30:00.000Z', '2026-05-29T18:30:00.000Z'),
  (8, 'react-008', 7, 1, 'Squid Game Season 2 trailer reaction', NULL, '2026-05-30T04:10:00.000Z', 620000, 45000, 3000, 'en', 1, 'https://www.youtube.com/watch?v=react-008', '2026-05-30T04:10:00.000Z', '2026-05-30T04:10:00.000Z'),
  (9, 'react-009', 8, 6, 'Goblin first time watch reaction', NULL, '2026-05-29T08:10:00.000Z', 153000, 9800, 710, 'pt', 1, 'https://www.youtube.com/watch?v=react-009', '2026-05-29T08:10:00.000Z', '2026-05-29T08:10:00.000Z'),
  (10, 'react-010', 9, 5, 'Mask Singer legendary stage reaction', NULL, '2026-05-29T12:00:00.000Z', 89000, 6100, 400, 'en', 1, 'https://www.youtube.com/watch?v=react-010', '2026-05-29T12:00:00.000Z', '2026-05-29T12:00:00.000Z'),
  (11, 'react-011', 10, 3, '웹툰 원작 비교 리뷰', NULL, '2026-05-29T14:10:00.000Z', 47000, 3200, 210, 'en', 1, 'https://www.youtube.com/watch?v=react-011', '2026-05-29T14:10:00.000Z', '2026-05-29T14:10:00.000Z'),
  (12, 'react-012', 6, 5, 'Top K-Drama OST medley reaction', NULL, '2026-05-29T16:00:00.000Z', 102000, 7000, 430, 'en', 1, 'https://www.youtube.com/watch?v=react-012', '2026-05-29T16:00:00.000Z', '2026-05-29T16:00:00.000Z');

INSERT INTO ranking_snapshots (
  id,
  content_id,
  category_id,
  rank_type,
  rank_value,
  reaction_count,
  total_views,
  snapshot_date
) VALUES
  (1, 1, 1, 'weekly', 1, 47, 2100000, '2026-05-30'),
  (2, 2, 2, 'weekly', 2, 33, 1800000, '2026-05-30'),
  (3, 3, 4, 'weekly', 3, 91, 5400000, '2026-05-30'),
  (4, 4, 3, 'weekly', 4, 28, 1600000, '2026-05-30'),
  (5, 5, 1, 'weekly', 5, 62, 3200000, '2026-05-30'),
  (6, 6, 4, 'weekly', 6, 24, 1020000, '2026-05-30'),
  (7, 7, 2, 'weekly', 7, 110, 6100000, '2026-05-30'),
  (8, 10, 3, 'weekly', 8, 19, 980000, '2026-05-30'),
  (9, 9, 4, 'weekly', 9, 22, 1200000, '2026-05-30'),
  (10, 8, 2, 'weekly', 10, 38, 2900000, '2026-05-30'),
  (11, 7, 2, 'popular', 1, 110, 6100000, '2026-05-30'),
  (12, 3, 4, 'popular', 2, 91, 5400000, '2026-05-30'),
  (13, 5, 1, 'popular', 3, 62, 3200000, '2026-05-30'),
  (14, 8, 2, 'popular', 4, 38, 2900000, '2026-05-30');

INSERT INTO app_settings (setting_key, value_text, updated_at) VALUES
  ('site.brandName', '어썸코리아', '2026-05-30T00:00:00.000Z'),
  ('site.brandTagline', 'Awesome Korea - 해외 반응 모음', '2026-05-30T00:00:00.000Z'),
  ('home.heroBadge', '관리자 추천', '2026-05-30T00:00:00.000Z'),
  ('home.heroToolbarCopy', '운영자가 직접 고른 해외 유튜브 반응을 메인에서 빠르게 살펴보세요.', '2026-05-30T00:00:00.000Z'),
  ('home.heroTitle', '지금 소개할 대표 반응을 운영자가 직접 편성합니다.', '2026-05-30T00:00:00.000Z'),
  ('home.heroDescription', '대문 문구, 카테고리, 유튜브 제목과 소개글, 메인 대표 반응까지 모두 관리자에서 조정할 수 있습니다.', '2026-05-30T00:00:00.000Z');

UPDATE reaction_videos
SET
  admin_title = '미국 채널이 본 극한직업 첫 반응',
  admin_description = '메인에서 먼저 보여줄 대표 리액션입니다. 코미디 포인트에 대한 해외 반응을 빠르게 확인할 수 있습니다.',
  is_featured_home = 1,
  featured_home_order = 1
WHERE youtube_video_id = 'react-001';

UPDATE reaction_videos
SET
  admin_title = '오징어게임 시즌2 해외 트레일러 반응',
  admin_description = '반응 속도와 조회수가 함께 높은 대표 트레일러 리액션입니다.',
  is_featured_home = 1,
  featured_home_order = 2
WHERE youtube_video_id = 'react-008';

UPDATE reaction_videos
SET
  admin_title = 'APT. 뮤직비디오 보컬 분석 리액션',
  admin_description = '음악 카테고리에서 메인에 올릴 수 있는 대표 반응 예시입니다.',
  is_featured_home = 1,
  featured_home_order = 3
WHERE youtube_video_id = 'react-005';

UPDATE reaction_videos
SET
  description = 'They were surprised by how quickly the comedy escalated into action and how sharp the audience reactions were.',
  localized_title = '미국 채널이 본 극한직업 첫 반응',
  localized_title_source = 'machine',
  localized_description = '코미디가 액션으로 빠르게 전환되는 흐름과 관객 반응이 특히 인상적이었다는 소개글입니다.',
  localized_description_source = 'machine'
WHERE youtube_video_id = 'react-001';

UPDATE reaction_videos
SET
  description = 'The hosts could not believe how energetic the pacing was for a first-time watch.',
  localized_title = '미국 시청자들의 극한직업 첫 감상',
  localized_title_source = 'machine',
  localized_description = '처음 보는 미국 시청자들이 빠른 전개와 에너지에 놀랐다는 소개글입니다.',
  localized_description_source = 'machine'
WHERE youtube_video_id = 'react-002';

UPDATE reaction_videos
SET
  description = 'A trailer reaction focused on the new season scale, character tension, and audience hype.',
  localized_title = '오징어 게임 시즌 2 트레일러 반응',
  localized_title_source = 'machine',
  localized_description = '새 시즌의 스케일과 긴장감, 기대 반응을 중심으로 한 트레일러 리액션 소개글입니다.',
  localized_description_source = 'machine'
WHERE youtube_video_id = 'react-008';

UPDATE reaction_videos
SET
  description = 'The channel breaks down the vocal layers and performance choices from the music video.',
  localized_title = 'APT. 뮤직비디오 보컬 분석 리액션',
  localized_title_source = 'machine',
  localized_description = '뮤직비디오의 보컬 레이어와 퍼포먼스 포인트를 함께 분석하는 소개글입니다.',
  localized_description_source = 'machine'
WHERE youtube_video_id = 'react-005';
