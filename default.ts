export const llama3_8b = {
  "llama3-8b": [
    { providerId: "groq", targetModel: "llama-3.1-8b-instant" },
    { providerId: "cerebras", targetModel: "llama3.1-8b" },
  ],
};

export const llama3_70b = {
  "llama3-70b": [
    { providerId: "groq", targetModel: "llama-3.3-70b-versatile" },
    { providerId: "cerebras", targetModel: "llama3.1-70b" },
  ],
};

export const openai_gpt_oss_120b = {
  "openai/gpt-oss-120b": [
    { providerId: "groq", targetModel: "openai/gpt-oss-120b" },
    { providerId: "cerebras", targetModel: "openai/gpt-oss-120b" },
  ],
};

export const defaultRouting = {
  default: [
    { providerId: "groq", targetModel: "llama-3.1-8b-instant" },
    { providerId: "cerebras", targetModel: "llama3.1-8b" },
  ],
};

export const groq = {
  groq: {
    name: "Groq System",
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: process.env.GROQ_API_KEY || "",
  },
};

export const cerebras = {
  cerebras: {
    name: "Cerebras System",
    url: "https://api.cerebras.ai/v1/chat/completions",
    key: process.env.CEREBRAS_API_KEY || "",
  },
};
