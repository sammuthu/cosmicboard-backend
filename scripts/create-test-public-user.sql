-- Script to create test user with public content
-- User: sammuthu@me.com
-- Purpose: Test public content discovery feature

-- Step 1: Get the existing user ID for nmuthu@gmail.com
DO $$
DECLARE
  source_user_id TEXT;
  new_user_id TEXT;
  new_project_id TEXT;
  new_event_id TEXT;
  source_project_id TEXT;
  source_media RECORD;
BEGIN
  -- Get source user ID
  SELECT id INTO source_user_id FROM "User" WHERE email = 'nmuthu@gmail.com';

  IF source_user_id IS NULL THEN
    RAISE NOTICE 'Source user nmuthu@gmail.com not found!';
    RETURN;
  END IF;

  RAISE NOTICE 'Source user ID: %', source_user_id;

  -- Step 2: Create new user sammuthu@me.com
  INSERT INTO "User" (
    id,
    email,
    name,
    avatar,
    username,
    bio,
    "emailVerified",
    "isActive",
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid()::text,
    'sammuthu@me.com',
    'Sam Muthu',
    NULL,
    'sammuthu',
    'Sharing my productivity journey with the CosmicBoard community! 🚀',
    NOW(),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    bio = EXCLUDED.bio,
    "updatedAt" = NOW()
  RETURNING id INTO new_user_id;

  RAISE NOTICE 'New user created with ID: %', new_user_id;

  -- Step 3: Create auth method for new user
  INSERT INTO "AuthMethod" (
    id,
    "userId",
    provider,
    email,
    "passwordHash",
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid()::text,
    new_user_id,
    'magic-link',
    'sammuthu@me.com',
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT ("userId", provider, "providerId") DO NOTHING;

  -- Step 4: Create a PUBLIC project
  INSERT INTO "Project" (
    id,
    name,
    description,
    "userId",
    priority,
    visibility,
    archived,
    "deletedAt",
    metadata,
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid()::text,
    'Building a Productivity System',
    'Documenting my journey to build the ultimate productivity system with CosmicBoard. Feel free to learn from my setup and workflows! 📊✨',
    new_user_id,
    'STELLAR',
    'PUBLIC',
    false,
    NULL,
    '{}',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_project_id;

  RAISE NOTICE 'Public project created with ID: %', new_project_id;

  -- Step 5: Create a PUBLIC event
  INSERT INTO "Event" (
    id,
    "projectId",
    name,
    description,
    "startDate",
    "endDate",
    location,
    visibility,
    "createdBy",
    "createdAt",
    "updatedAt",
    "deletedAt"
  ) VALUES (
    gen_random_uuid()::text,
    new_project_id,
    'CosmicBoard Workshop 2025',
    'Join me for a live workshop on productivity workflows and cosmic organization techniques!',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
    'Virtual - Zoom',
    'PUBLIC',
    new_user_id,
    NOW(),
    NOW(),
    NULL
  )
  RETURNING id INTO new_event_id;

  RAISE NOTICE 'Public event created with ID: %', new_event_id;

  -- Step 6: Create PUBLIC tasks (Radar)
  INSERT INTO "Task" (
    id,
    "projectId",
    "eventId",
    title,
    content,
    priority,
    visibility,
    status,
    tags,
    "dueDate",
    "completedAt",
    "creatorId",
    "assigneeId",
    metadata,
    "createdAt",
    "updatedAt"
  ) VALUES
  -- Task 1
  (
    gen_random_uuid()::text,
    new_project_id,
    NULL,
    'Set up morning routine workflow',
    'Create a structured morning routine with time blocks for meditation, exercise, and planning. Sharing this to help others build consistency! 🌅',
    'SUPERNOVA',
    'PUBLIC',
    'ACTIVE',
    ARRAY['productivity', 'routine', 'morning'],
    NOW() + INTERVAL '3 days',
    NULL,
    new_user_id,
    new_user_id,
    '{"contentHtml": "Create a structured morning routine with time blocks for meditation, exercise, and planning. Sharing this to help others build consistency! 🌅"}',
    NOW(),
    NOW()
  ),
  -- Task 2
  (
    gen_random_uuid()::text,
    new_project_id,
    new_event_id,
    'Prepare workshop materials',
    'Create slides and demo content for the upcoming CosmicBoard workshop. Will share templates with attendees! 📝',
    'STELLAR',
    'PUBLIC',
    'ACTIVE',
    ARRAY['workshop', 'teaching', 'preparation'],
    NOW() + INTERVAL '5 days',
    NULL,
    new_user_id,
    new_user_id,
    '{"contentHtml": "Create slides and demo content for the upcoming CosmicBoard workshop. Will share templates with attendees! 📝"}',
    NOW(),
    NOW()
  ),
  -- Task 3
  (
    gen_random_uuid()::text,
    new_project_id,
    NULL,
    'Document my GTD workflow',
    'Write a comprehensive guide on how I use Getting Things Done methodology with CosmicBoard. This helped me 10x my productivity! 🚀',
    'STELLAR',
    'PUBLIC',
    'COMPLETED',
    ARRAY['gtd', 'workflow', 'documentation'],
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day',
    new_user_id,
    new_user_id,
    '{"contentHtml": "Write a comprehensive guide on how I use Getting Things Done methodology with CosmicBoard. This helped me 10x my productivity! 🚀"}',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day'
  );

  RAISE NOTICE 'Created 3 public tasks';

  -- Step 7: Create PUBLIC notes (References)
  INSERT INTO "Reference" (
    id,
    "projectId",
    "userId",
    title,
    content,
    category,
    visibility,
    tags,
    language,
    "deletedAt",
    metadata,
    "createdAt",
    "updatedAt"
  ) VALUES
  -- Note 1
  (
    gen_random_uuid()::text,
    new_project_id,
    new_user_id,
    'My Productivity Principles',
    E'# Core Principles\n\n1. **Start with Why** - Every task must have clear purpose\n2. **Time Block Everything** - No task without a scheduled time\n3. **Review Weekly** - Sunday planning session is non-negotiable\n4. **One Thing at a Time** - Deep work over multitasking\n5. **Energy Management** - Match tasks to energy levels\n\nThese principles transformed my productivity. Hope they help you too! 🎯',
    'NOTE',
    'PUBLIC',
    ARRAY['productivity', 'principles', 'workflow'],
    'markdown',
    NULL,
    '{}',
    NOW(),
    NOW()
  ),
  -- Note 2
  (
    gen_random_uuid()::text,
    new_project_id,
    new_user_id,
    'Quick Wins for New Users',
    E'# Getting Started with CosmicBoard\n\n## Week 1: Foundation\n- [ ] Set up your first project\n- [ ] Create 3-5 tasks\n- [ ] Try different priority levels\n- [ ] Explore themes\n\n## Week 2: Habits\n- [ ] Daily review (5 mins)\n- [ ] Weekly planning (30 mins)\n- [ ] Use tags for contexts\n- [ ] Link tasks to events\n\n## Week 3: Mastery\n- [ ] Set up your workflow\n- [ ] Use neural notes for documentation\n- [ ] Explore media features\n- [ ] Share public content\n\nFeel free to copy this checklist! ✨',
    'DOCUMENTATION',
    'PUBLIC',
    ARRAY['tutorial', 'getting-started', 'guide'],
    'markdown',
    NULL,
    '{}',
    NOW(),
    NOW()
  ),
  -- Note 3
  (
    gen_random_uuid()::text,
    new_project_id,
    new_user_id,
    'Useful Keyboard Shortcuts',
    E'# CosmicBoard Keyboard Shortcuts\n\n## Navigation\n- `Cmd/Ctrl + K` - Global search\n- `Cmd/Ctrl + N` - New project\n- `Cmd/Ctrl + V` - Paste screenshot\n\n## Tasks\n- `Enter` - Create new task\n- `Cmd/Ctrl + Enter` - Complete task\n- `Delete` - Move to recycle bin\n\n## Productivity Tip\nLearn one shortcut per day. By week 2, you''ll be flying through your tasks! 🚀',
    'SNIPPET',
    'PUBLIC',
    ARRAY['shortcuts', 'tips', 'productivity'],
    'markdown',
    NULL,
    '{}',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created 3 public notes';

  -- Step 8: Copy media files from source user
  -- Get source project
  SELECT id INTO source_project_id FROM "Project" WHERE "userId" = source_user_id LIMIT 1;

  IF source_project_id IS NOT NULL THEN
    RAISE NOTICE 'Copying media from source project: %', source_project_id;

    -- Copy media records (we'll handle S3 files separately)
    FOR source_media IN
      SELECT * FROM "Media"
      WHERE "userId" = source_user_id
      AND "deletedAt" IS NULL
      LIMIT 5
    LOOP
      INSERT INTO "Media" (
        id,
        "projectId",
        "userId",
        type,
        visibility,
        name,
        url,
        "thumbnailUrl",
        size,
        "mimeType",
        "deletedAt",
        metadata,
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        new_project_id,
        new_user_id,
        source_media.type,
        'PUBLIC', -- Make all copied media PUBLIC
        source_media.name,
        -- Keep same URL for now, will copy S3 files separately
        source_media.url,
        source_media."thumbnailUrl",
        source_media.size,
        source_media."mimeType",
        NULL,
        source_media.metadata,
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Copied media: % (type: %)', source_media.name, source_media.type;
    END LOOP;
  END IF;

  RAISE NOTICE '=== Summary ===';
  RAISE NOTICE 'User: sammuthu@me.com (ID: %)', new_user_id;
  RAISE NOTICE 'Project: % (ID: %, PUBLIC)', 'Building a Productivity System', new_project_id;
  RAISE NOTICE 'Event: % (ID: %, PUBLIC)', 'CosmicBoard Workshop 2025', new_event_id;
  RAISE NOTICE 'Tasks: 3 PUBLIC tasks created';
  RAISE NOTICE 'Notes: 3 PUBLIC references created';
  RAISE NOTICE 'Media: Copied from source user (PUBLIC)';
  RAISE NOTICE '=== Done! ===';

END $$;
