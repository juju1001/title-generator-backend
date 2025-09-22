import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai' // 或你用的 SDK

// 如果你用的是通义千问或其他，请替换为对应 SDK
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export async function generateTitles(prompt: string): Promise<string[]> {
  try {
    const messages: ChatCompletionRequestMessage[] = [
      {
        role: 'system',
        content:
          '你是一个爆款标题生成专家，请严格按照要求生成10个标题，每行一个，不要编号，不要额外说明。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.8,
      max_tokens: 500,
    })

    const text = response.data.choices[0]?.message?.content || ''
    // 按行分割，过滤空行
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.match(/^\d+[\.、]/)) // 过滤掉带编号的行
  } catch (error) {
    console.error('AI 生成失败:', error)
    throw new Error('AI 生成失败')
  }
}
