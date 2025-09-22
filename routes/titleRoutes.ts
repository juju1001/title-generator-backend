import express from 'express'
import { generateTitles } from '../services/aiServices' // ← 你原来的 AI 生成函数

const router = express.Router()

// 类型定义
interface GenerateRequest {
  topic: string
  style: string
}

// 风格模板映射（TypeScript 类型安全）
const STYLE_PROMPTS: Record<string, string> = {
  爆款小红书: '请生成10个小红书爆款风格标题，带emoji，有悬念感，口语化，用🔥💣👗等符号',
  知乎专业风: '请生成10个知乎高赞风格标题，理性、有数据、有方法论，避免夸张',
  抖音短平快: '请生成10个抖音爆款标题，前3秒抓眼球，带‘千万别’‘震惊’‘99%人不知道’',
  毒舌吐槽风: '请生成10个毒舌博主风格标题，带讽刺、反转、情绪强烈，用🙄💅💣等emoji',
}

router.post('/api/generate-titles', async (req, res) => {
  try {
    const { topic, style }: GenerateRequest = req.body

    if (!topic) {
      return res.status(400).json({ error: '主题不能为空' })
    }

    // 获取风格对应的 prompt，如果风格不存在，使用默认
    const basePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS['爆款小红书']
    const fullPrompt = `${basePrompt}，内容主题是：${topic}`

    // 调用你原来的 AI 生成函数
    const titles = await generateTitles(fullPrompt) // ← 确保这个函数返回 string[]

    res.json({ titles })
  } catch (error) {
    console.error('生成标题出错:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
