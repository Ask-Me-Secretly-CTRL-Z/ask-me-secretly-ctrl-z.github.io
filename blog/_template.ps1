<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{TITLE} — CTRL-Z Blog</title>
    <link rel="stylesheet" href="../style.css">
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;800&family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        .article-container {{ max-width: 800px; margin: 0 auto; padding: 40px 20px 80px; }}
        .article-header h1 {{ font-size: 1.8rem; margin-bottom: 10px; line-height: 1.4; }}
        .article-body {{ background: var(--card-bg); border-radius: 18px; padding: 35px; box-shadow: var(--shadow); border: 1px solid var(--border-color); line-height: 1.9; }}
        .article-body h2 {{ font-size: 1.35rem; margin: 30px 0 14px; padding-bottom: 8px; border-bottom: 2px solid var(--border-color); }}
        .article-body p {{ margin-bottom: 16px; }}
        .article-body code {{ background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.9rem; direction: ltr; display: inline-block; }}
        .article-body pre {{ background: #1e293b; color: #e2e8f0; padding: 18px 22px; border-radius: 12px; direction: ltr; text-align: left; overflow-x: auto; margin: 15px 0; font-size: 0.85rem; }}
        .article-body strong {{ color: var(--accent); }}
        .back-link {{ display: inline-flex; align-items: center; gap: 8px; margin-bottom: 25px; color: var(--text-secondary); text-decoration: none; font-size: 0.95rem; }}
        .back-link:hover {{ color: var(--accent); }}
        @media (max-width: 600px) {{ .article-header h1 {{ font-size: 1.4rem; }} .article-body {{ padding: 20px; }} }}
    </style>
</head>
<body>
    <div class="article-container">
        <a href="../blog.html" class="back-link">← العودة للمدونة</a>
        <div class="article-header"><h1>{TITLE}</h1></div>
        <div class="article-body">{BODY}</div>
    </div>
</body>
</html>
