// @ts-ignore
import { pipeline, env } from "@huggingface/transformers";
import { Message, Language, PatientDemographics } from "../types";

// Configure transformers.js for maximum compatibility in restricted environments
env.allowLocalModels = false;
env.useBrowserCache = true;

// Disable multi-threading to avoid SharedArrayBuffer issues in sandboxed environments
// @ts-ignore
if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
  // @ts-ignore
  env.backends.onnx.wasm.numThreads = 1;
}

let generator: any = null;
const MODEL_ID = "Xenova/Qwen1.5-0.5B-Chat"; 

export async function initLocalModel(
  onProgress: (progress: { text: string; loaded?: number; total?: number }) => void
): Promise<any> {
  if (generator) return generator;
  
  try {
    onProgress({ text: "Initializing Local AI engine (WebGPU)..." });
    
    generator = await pipeline('text-generation', MODEL_ID, {
      device: 'webgpu', 
      dtype: 'q4', 
      progress_callback: (p: any) => {
        if (p.status === 'progress') {
          onProgress({ 
            text: `Downloading AI model: ${Math.round(p.progress)}%`,
            loaded: p.loaded,
            total: p.total
          });
        } else if (p.status === 'done') {
          onProgress({ text: "Model initialized. System ready." });
        }
      }
    });
    
    return generator;
  } catch (error) {
    console.warn("WebGPU failed, falling back to CPU (Wasm).", error);
    
    generator = await pipeline('text-generation', MODEL_ID, {
      device: 'wasm', 
      dtype: 'q4',
      progress_callback: (p: any) => {
        if (p.status === 'progress') {
          onProgress({ 
            text: `Downloading AI model (CPU mode): ${Math.round(p.progress)}%`
          });
        }
      }
    });
    
    return generator;
  }
}

export async function getLocalChatResponse(
  messages: Message[],
  language: Language,
  demographics?: PatientDemographics
): Promise<string> {
  if (!generator) {
    return "Local AI model not initialized. Please click 'Initialize AI' to start.";
  }

  const systemPrompt = `You are a helpful, empathetic, and highly knowledgeable Interventional Radiology (IR) AI assistant.
Your goal is to educate patients about minimally invasive IR procedures in simple, easy-to-understand language.
Current User Language: ${language}
${demographics ? `Patient Context: Age: ${demographics.age || 'Unknown'}, Gender: ${demographics.gender || 'Unknown'}, History: ${demographics.history || 'Unknown'}, Medications: ${demographics.medications || 'None'}, Allergies: ${demographics.allergies || 'None'}, Procedure: ${demographics.procedure || 'Not Specified'}` : ''}
Respond directly to the user's query in their language. Keep responses concise and avoid medical jargon where possible.`;

  // Format for Qwen Chat template
  const prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n${messages.map(m => `<|im_start|>${m.role === 'user' ? 'user' : 'assistant'}\n${m.text}<|im_end|>`).join('\\n')}\n<|im_start|>assistant\n`;

  try {
    const output = await generator(prompt, {
      max_new_tokens: 512,
      temperature: 0.7,
      do_sample: true,
      top_k: 50,
      return_full_text: false,
    });

    // @ts-ignore
    const content = output[0].generated_text.trim();
    return content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Local model generation error:", error);
    return "I'm sorry, I encountered an error while processing your request locally.";
  }
}
