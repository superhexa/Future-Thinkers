"""Static reference data + idempotent seeding for development.
Jordan national hierarchy, book categories, clubs, achievements, admin, sample books."""
from bson import ObjectId
from db import db, now_iso
from auth import hash_password
import os

GOVERNORATES = [
    "عمّان", "إربد", "الزرقاء", "البلقاء", "الكرك", "معان",
    "العقبة", "عجلون", "جرش", "المفرق", "الطفيلة", "مادبا",
]

# governorate -> list of directorates
DIRECTORATES = {
    "عمّان": ["مديرية لواء قصبة عمّان", "مديرية لواء الجامعة", "مديرية لواء ماركا", "مديرية قصبة عمّان الثانية", "مديرية لواء سحاب"],
    "إربد": ["مديرية إربد الأولى", "مديرية إربد الثانية", "مديرية لواء الرمثا", "مديرية لواء بني كنانة"],
    "الزرقاء": ["مديرية الزرقاء الأولى", "مديرية الزرقاء الثانية", "مديرية لواء الرصيفة"],
    "البلقاء": ["مديرية قصبة السلط", "مديرية لواء عين الباشا", "مديرية لواء دير علا"],
    "الكرك": ["مديرية قصبة الكرك", "مديرية لواء المزار الجنوبي"],
    "معان": ["مديرية قصبة معان", "مديرية لواء البتراء"],
    "العقبة": ["مديرية العقبة", "مديرية لواء القويرة"],
    "عجلون": ["مديرية عجلون", "مديرية لواء كفرنجة"],
    "جرش": ["مديرية جرش", "مديرية لواء برما"],
    "المفرق": ["مديرية قصبة المفرق", "مديرية لواء البادية الشمالية الغربية"],
    "الطفيلة": ["مديرية الطفيلة", "مديرية لواء بصيرا"],
    "مادبا": ["مديرية مادبا", "مديرية لواء ذيبان"],
}

# a few real-sounding schools per directorate (dev seed)
SCHOOL_NAMES = [
    "مدرسة الملك عبدالله الثاني للتميز", "مدرسة الحسين الثانوية الشاملة",
    "مدرسة اليوبيل", "مدرسة الأمير حسن الثانوية", "المدرسة النموذجية",
    "مدرسة الرشيد الثانوية", "مدرسة الفلاح الأساسية",
]

CATEGORIES = [
    {"slug": "science", "name": "علوم", "icon": "Atom", "color": "#2563EB"},
    {"slug": "culture", "name": "ثقافة", "icon": "Landmark", "color": "#059669"},
    {"slug": "religion", "name": "دين", "icon": "BookOpen", "color": "#0A192F"},
    {"slug": "history", "name": "تاريخ", "icon": "ScrollText", "color": "#D97706"},
    {"slug": "literature", "name": "أدب", "icon": "Feather", "color": "#E11D48"},
    {"slug": "novels", "name": "روايات", "icon": "Library", "color": "#7C3AED"},
    {"slug": "philosophy", "name": "فلسفة", "icon": "Brain", "color": "#0891B2"},
    {"slug": "programming", "name": "برمجة", "icon": "Code2", "color": "#1E293B"},
    {"slug": "ai", "name": "ذكاء اصطناعي", "icon": "Cpu", "color": "#2563EB"},
    {"slug": "economics", "name": "اقتصاد", "icon": "TrendingUp", "color": "#059669"},
    {"slug": "entrepreneurship", "name": "ريادة أعمال", "icon": "Rocket", "color": "#D97706"},
    {"slug": "self-dev", "name": "تطوير الذات", "icon": "Sparkles", "color": "#E11D48"},
    {"slug": "arts", "name": "فنون", "icon": "Palette", "color": "#7C3AED"},
    {"slug": "technology", "name": "تكنولوجيا", "icon": "Laptop", "color": "#0891B2"},
    {"slug": "general", "name": "معرفة عامة", "icon": "GraduationCap", "color": "#475569"},
]

CLUBS = [
    {"slug": "chess", "name": "نادي الشطرنج", "icon": "Crown", "color": "#0A192F",
     "description": "تحدَّ زملاءك في مباريات شطرنج حقيقية، وارتقِ في تصنيف ELO الوطني."},
    {"slug": "dialogue", "name": "نادي الحوار", "icon": "MessagesSquare", "color": "#2563EB",
     "description": "مساحة للنقاش المعرفي والثقافي والعلمي بين الطلاب والمعلمين."},
    {"slug": "programming", "name": "نادي البرمجة", "icon": "Code2", "color": "#1E293B",
     "description": "تحديات برمجية ومسائل خوارزمية بمستويات متدرجة ولوحة صدارة."},
    {"slug": "science", "name": "نادي العلوم", "icon": "Atom", "color": "#059669",
     "description": "مسابقات علمية، أسئلة، تحديات وتجارب تعليمية."},
    {"slug": "reading", "name": "نادي القراءة", "icon": "BookOpen", "color": "#D97706",
     "description": "تحديات قراءة، أهداف، سلاسل قراءة ومراجعات كتب."},
    {"slug": "innovation", "name": "نادي الابتكار", "icon": "Lightbulb", "color": "#E11D48",
     "description": "مشاريع وأفكار واختراعات طلابية وتشكيل فرق وتصويت."},
    {"slug": "debate", "name": "نادي المناظرات", "icon": "Scale", "color": "#7C3AED",
     "description": "مناظرات، فرق، جولات، حجج وتصويت وتقييم."},
    {"slug": "literature", "name": "نادي اللغة والأدب", "icon": "Feather", "color": "#0891B2",
     "description": "قصص، شعر، مقالات وكتابة إبداعية تُنشر بعد المراجعة."},
    {"slug": "entrepreneurship", "name": "نادي ريادة الأعمال", "icon": "Rocket", "color": "#059669",
     "description": "أفكار ومشاريع ناشئة وتحديات وعروض تقديمية."},
    {"slug": "ai", "name": "نادي الذكاء الاصطناعي", "icon": "Cpu", "color": "#2563EB",
     "description": "استكشف عالم الذكاء الاصطناعي عبر تحديات ومشاريع تطبيقية."},
    {"slug": "arts", "name": "نادي الفنون والإبداع", "icon": "Palette", "color": "#E11D48",
     "description": "فنون بصرية وإبداع رقمي ومعارض أعمال طلابية."},
]

ACHIEVEMENTS = [
    {"key": "first_book", "title": "أول كتاب", "description": "أكملت قراءة أول كتاب", "metric": "books_read", "threshold": 1, "badge": "قارئ", "icon": "BookOpen"},
    {"key": "bookworm", "title": "دودة الكتب", "description": "قرأت 5 كتب", "metric": "books_read", "threshold": 5, "badge": "قارئ نهم", "icon": "Library"},
    {"key": "scholar", "title": "باحث معرفي", "description": "قرأت 15 كتاب", "metric": "books_read", "threshold": 15, "badge": "باحث", "icon": "GraduationCap"},
    {"key": "first_post", "title": "أول مشاركة", "description": "شاركت في نادي الحوار", "metric": "posts", "threshold": 1, "badge": "محاور", "icon": "MessageSquare"},
    {"key": "active_debater", "title": "محاور متميز", "description": "20 مشاركة في الحوار", "metric": "posts", "threshold": 20, "badge": "محاور متميز", "icon": "MessagesSquare"},
    {"key": "chess_starter", "title": "بداية الشطرنج", "description": "أنهيت أول مباراة شطرنج", "metric": "chess_games", "threshold": 1, "badge": "لاعب شطرنج", "icon": "Crown"},
    {"key": "chess_master", "title": "خبير الشطرنج", "description": "فزت بـ 10 مباريات", "metric": "chess_wins", "threshold": 10, "badge": "أستاذ شطرنج", "icon": "Trophy"},
    {"key": "event_goer", "title": "مشارك فعّال", "description": "شاركت في أول فعالية", "metric": "events", "threshold": 1, "badge": "نشيط", "icon": "CalendarCheck"},
    {"key": "competitor", "title": "منافس", "description": "شاركت في أول مسابقة", "metric": "competitions", "threshold": 1, "badge": "منافس", "icon": "Medal"},
    {"key": "streak_7", "title": "أسبوع متواصل", "description": "حافظت على نشاطك 7 أيام", "metric": "max_streak", "threshold": 7, "badge": "مثابر", "icon": "Flame"},
    {"key": "level_5", "title": "مفكر ناشئ", "description": "وصلت للمستوى 5", "metric": "level", "threshold": 5, "badge": "مفكر ناشئ", "icon": "Star"},
    {"key": "xp_2000", "title": "جامع الخبرة", "description": "جمعت 2000 نقطة خبرة", "metric": "xp", "threshold": 2000, "badge": "خبير", "icon": "Sparkles"},
]

POINTS_CONFIG = {
    "read_book": 50, "review_book": 20, "create_discussion": 15,
    "reply_discussion": 8, "receive_like": 3, "join_event": 25,
    "win_chess": 30, "play_chess": 10, "daily_checkin": 5,
    "join_competition": 20, "win_competition": 100, "upload_book_approved": 40,
}

_COVERS = [
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80",
    "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&q=80",
    "https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80",
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80",
    "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80",
]
_PDF1 = "https://css4.pub/2015/textbook/somatosensory.pdf"
_PDF2 = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

SAMPLE_BOOKS = [
    {"title": "مقدمة في الذكاء الاصطناعي", "author": "د. أحمد الخطيب", "category": "ai",
     "description": "رحلة مبسطة إلى عالم الذكاء الاصطناعي وتطبيقاته الحديثة وأثره على المستقبل.", "pages": 210, "year": 2023, "age": "15+"},
    {"title": "أساسيات البرمجة بلغة بايثون", "author": "م. سارة العمري", "category": "programming",
     "description": "دليل عملي لتعلم البرمجة من الصفر مع تمارين وتطبيقات واقعية.", "pages": 320, "year": 2022, "age": "13+"},
    {"title": "تاريخ الأردن الحديث", "author": "د. محمد الشريدة", "category": "history",
     "description": "قراءة موثقة في تاريخ المملكة الأردنية الهاشمية ومسيرة بنائها.", "pages": 280, "year": 2021, "age": "12+"},
    {"title": "فن التفكير العلمي", "author": "د. ليلى القاسم", "category": "science",
     "description": "كيف نفكر كالعلماء؟ منهجية البحث والتجربة والاستنتاج.", "pages": 190, "year": 2023, "age": "14+"},
    {"title": "عقول ريادية", "author": "خالد المومني", "category": "entrepreneurship",
     "description": "قصص ملهمة ودروس عملية في بناء المشاريع الناشئة وريادة الأعمال.", "pages": 240, "year": 2022, "age": "15+"},
    {"title": "في رحاب الفلسفة", "author": "د. رنا حدّاد", "category": "philosophy",
     "description": "مدخل إلى أهم الأسئلة الفلسفية عبر التاريخ بأسلوب مبسّط.", "pages": 260, "year": 2020, "age": "16+"},
    {"title": "أسرار الكون", "author": "د. يوسف النجار", "category": "science",
     "description": "جولة في الفيزياء الفلكية من الذرّة إلى المجرّات.", "pages": 300, "year": 2023, "age": "13+"},
    {"title": "بلاغة الكلمة", "author": "أ. هالة زيدان", "category": "literature",
     "description": "مختارات أدبية وتحليل لجماليات اللغة العربية.", "pages": 175, "year": 2021, "age": "12+"},
    {"title": "اقتصاد بلا تعقيد", "author": "د. سامي درويش", "category": "economics",
     "description": "المفاهيم الاقتصادية الأساسية التي يحتاجها كل شاب.", "pages": 220, "year": 2022, "age": "15+"},
    {"title": "عادات العقل الناجح", "author": "منى الصمادي", "category": "self-dev",
     "description": "استراتيجيات عملية لبناء عادات إيجابية وتطوير الذات.", "pages": 200, "year": 2023, "age": "14+"},
    {"title": "حكايات من التراث", "author": "أ. عمر الطراونة", "category": "culture",
     "description": "قصص شعبية أردنية وعربية تحمل قيماً وحكماً خالدة.", "pages": 160, "year": 2019, "age": "10+"},
    {"title": "الرواية الأولى", "author": "ديمة الفاعوري", "category": "novels",
     "description": "رواية شبابية عن الحلم والإصرار وصناعة المستقبل.", "pages": 340, "year": 2023, "age": "14+"},
]


async def seed_all():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.xp_transactions.create_index([("user_id", 1), ("created_at", -1)])
    await db.books.create_index([("status", 1), ("category", 1)])

    # categories
    for c in CATEGORIES:
        await db.categories.update_one({"slug": c["slug"]}, {"$set": c}, upsert=True)

    # clubs
    for c in CLUBS:
        await db.clubs.update_one({"slug": c["slug"]},
            {"$setOnInsert": {**c, "members_count": 0, "created_at": now_iso()}}, upsert=True)

    # achievements
    for a in ACHIEVEMENTS:
        await db.achievements.update_one({"key": a["key"]}, {"$set": a}, upsert=True)

    # points config (CMS-editable)
    await db.settings.update_one({"key": "points_config"},
        {"$setOnInsert": {"key": "points_config", "value": POINTS_CONFIG}}, upsert=True)

    # CMS landing content
    await db.settings.update_one({"key": "landing_cms"}, {"$setOnInsert": {
        "key": "landing_cms",
        "value": {
            "vision": "أن نبني جيلاً أردنياً قارئاً ومفكراً ومبدعاً، يصنع المعرفة ويقود المستقبل.",
            "mission": "بناء مجتمع طلابي معرفي وطني يتيح القراءة والحوار والتعلّم والمنافسة والإبداع في بيئة تنافسية إيجابية.",
            "goals": [
                "نشر ثقافة القراءة بين طلاب الأردن",
                "تعزيز الحوار الفكري والعلمي الهادف",
                "اكتشاف المواهب ورعاية المبدعين",
                "دعم الابتكار وريادة الأعمال",
                "تشجيع البحث والتفكير العلمي",
                "خلق بيئة تنافسية وطنية إيجابية",
            ],
        }}}, upsert=True)

    # national hierarchy
    if await db.governorates.count_documents({}) == 0:
        for gname in GOVERNORATES:
            gov = await db.governorates.insert_one({"name": gname, "created_at": now_iso()})
            gid = str(gov.inserted_id)
            for dname in DIRECTORATES.get(gname, [f"مديرية {gname}"]):
                d = await db.directorates.insert_one(
                    {"name": dname, "governorate_id": gid, "governorate_name": gname, "created_at": now_iso()})
                did = str(d.inserted_id)
                for i, sname in enumerate(SCHOOL_NAMES[:4]):
                    await db.schools.insert_one({
                        "name": f"{sname} - {dname.replace('مديرية ', '')}",
                        "directorate_id": did, "directorate_name": dname,
                        "governorate_id": gid, "governorate_name": gname,
                        "students_count": 0, "created_at": now_iso(),
                    })

    # admin / owner account
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@futurethinkers.jo")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "name": "مسؤول المنصة", "email": admin_email,
            "password_hash": hash_password(admin_password), "role": "super_admin",
            "status": "active", "xp": 0, "level": 1, "level_title": "قارئ مبتدئ",
            "extra_permissions": [], "badges": [], "achievements": [], "stats": {},
            "streak": 0, "chess_rating": 1200, "created_at": now_iso(),
        })

    # sample approved books (dev). pdf via public sample urls, cover images.
    admin = await db.users.find_one({"email": admin_email})
    admin_id = str(admin["_id"]) if admin else None
    if await db.books.count_documents({}) == 0 and admin_id:
        for i, b in enumerate(SAMPLE_BOOKS):
            await db.books.insert_one({
                **b,
                "cover_url": _COVERS[i % len(_COVERS)],
                "external_pdf_url": _PDF1 if i % 2 == 0 else _PDF2,
                "storage_path": None, "cover_path": None,
                "language": "العربية", "publisher": "منصة مفكري المستقبل",
                "tags": [b["category"]], "status": "approved",
                "uploaded_by": admin_id, "approved_by": admin_id,
                "views": 0, "downloads": 0, "favorites_count": 0,
                "rating_avg": 0, "rating_count": 0,
                "created_at": now_iso(), "approved_at": now_iso(),
            })
