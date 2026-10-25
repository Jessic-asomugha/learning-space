# Learning Space

Practice labs, quizzes and knowledge checks for HTML, CSS, JavaScript and Full stack debugging. Claude is not used here: questions go to Groq, topics are saved in an Upstash Redis database.

## Put it online

1. Upload this folder to a new GitHub repository, then in Vercel choose **Add New > Project**, import the repository and press **Deploy**. Leave every build setting as it is.
2. In the Vercel project, open **Settings > Environment Variables** and add:
   - `GROQ_API_KEY`: your key from console.groq.com
   - `APP_PASSWORD`: any password you choose. The page asks for it once per device, so nobody else can use your Groq quota.
3. Open **Storage** (or the Marketplace), add **Upstash Redis** with the free plan, and connect it to this project. Vercel adds the database settings by itself.
4. Go to **Deployments** and **Redeploy** so the new settings take effect.

Open the site on your laptop and phone, enter the password once on each, and your topics sync.

## Notes

- Until the database is connected the page still works, saving topics in the browser on that device only.
- `GROQ_MODEL` is optional. The default is `openai/gpt-oss-120b`.
- **Back up** downloads your topics as a file and **Restore** loads one back.
- Never put the Groq key in `index.html`. It belongs only in the Vercel settings.
