// server/server.js
const express = require('express')
const cors = require('cors')
const axios = require('axios')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(
  cors({
    origin: ['http://localhost:5173', 'https://yourdomain.com'],
    credentials: true,
  }),
)

app.use(express.json())

// ✅ 定义风格模板（直接写在 server.js 里）
const STYLE_PROMPTS = {
  爆款小红书: `
你是一个小红书爆款标题生成器，请根据主题“{主题}”，生成5个吸引眼球、带emoji、口语化、有悬念或情绪共鸣的标题。

要求：
- 每个标题不超过20字
- 必须带1-2个emoji
- 用“我”、“你”、“谁懂啊”、“救命”、“真的绝了”等口语词
- 风格：活泼、种草、情绪共鸣

示例：
🔥谁懂啊！健身3个月，腰围狂减8cm！
💥打工人必看！5分钟搞定周报，老板狂夸！
✨素人改造｜换发型=换头！闺蜜追着问链接！

请直接输出标题，不要解释，不要序号，每行一个。
⚠️ 注意：不要解释词语含义！不要写“示例”！直接生成标题！
`,

  知乎专业风: `
你是一个知乎高赞标题生成器，请根据主题“{主题}”，生成5个理性、有深度、带方法论或数据支撑的标题。

要求：
- 每个标题不超过25字
- 用“为什么”、“如何”、“有哪些”、“深度解析”等词
- 风格：专业、冷静、有信息增量

示例：
为什么90%的人健身3个月就放弃？科学解析+解决方案
如何用「番茄工作法」提升300%效率？亲测有效
有哪些不为人知的租房避坑指南？律师朋友告诉我这些

请直接输出标题，不要解释，不要序号，每行一个。
⚠️ 注意：不要解释词语含义！不要写“示例”！直接生成标题！
`,

  抖音短平快: `
你是一个抖音爆款标题生成器，请根据主题“{主题}”，生成5个前3秒就能抓住眼球的标题。

要求：
- 每个标题不超过15字
- 开头必须有强钩子：“注意！”、“速看！”、“别划走！”、“最后1秒惊呆！”
- 用感叹号、问号、省略号制造悬念
- 风格：快节奏、强冲击、反转结局

示例：
注意！这样睡觉=慢性自杀！
速看！月薪3千到3万，我只做了这件事...
别划走！99%人不知道的微信隐藏功能！

请直接输出标题，不要解释，不要序号，每行一个。
⚠️ 注意：不要解释词语含义！不要写“示例”！直接生成标题！
`,

  毒舌吐槽风: `
你是一个毒舌段子手，请根据主题“{主题}”，生成5个带反转、情绪、吐槽的标题。

要求：
- 每个标题不超过20字
- 用“笑死”、“谁懂”、“离谱”、“求你们别...”、“我又...”等情绪词
- 带反转 or 自嘲 or 夸张
- 风格：犀利、幽默、有网感

示例：
笑死！谁家好人上班带饭啊？
谁懂啊！男朋友说“多喝热水”那一刻我裂开了
求你们别再买网红小家电了！智商税第一名！

请直接输出标题，不要解释，不要序号，每行一个。
⚠️ 注意：不要解释词语含义！不要写“示例”！直接生成标题！
`,
}

// ✅ 构建 Prompt 的函数
function buildPrompt(promptText, style = '爆款小红书') {
  const template = STYLE_PROMPTS[style] || STYLE_PROMPTS['爆款小红书']
  return template.replace('{主题}', promptText.trim())
}

// ✅ 代理接口：接收前端请求 → 生成 Prompt → 转发给 DashScope
app.post('/api/generate', async (req, res) => {
  try {
    // ✅ 获取 prompt 和 style
    const { prompt, style } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt 不能为空' })
    }

    const apiKey = process.env.QWEN_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: '服务器未配置API密钥' })
    }

    // ✅ 构建动态 Prompt！
    const finalPrompt = buildPrompt(prompt, style)

    console.log('🎨 选择风格:', style)
    console.log('📝 最终Prompt:', finalPrompt)

    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-turbo',
        input: {
          prompt: finalPrompt, // 👈 关键！用构建好的 Prompt！
        },
        parameters: {
          result_format: 'text',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 30000,
      },
    )

    if (response.data?.output?.text) {
      // ✅ 过滤掉示例、要求、空行
      const titles = response.data.output.text
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => {
          return (
            t.length > 0 &&
            !t.startsWith('//') &&
            !t.includes('示例：') &&
            !t.includes('要求：') &&
            !t.includes('注意：') &&
            !t.includes('风格：') &&
            !t.includes('你是一个')
          )
        })
        .slice(0, 10)

      res.json({ titles })
    } else {
      res.status(500).json({
        error: 'AI返回格式异常',
        raw: response.data,
      })
    }
  } catch (error) {
    console.error('AI生成失败:', error.message)
    res.status(500).json({
      error: 'AI服务调用失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: '后端代理运行中' })
})
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 后端代理运行在 http://0.0.0.0:${PORT}`);
  console.log(`✅ 健康检查: /health`);
  console.log(`✅ 生成接口: POST /api/generate`);
});
