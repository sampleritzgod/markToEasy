/**
 * Provider-agnostic image generation contract.
 * Add a new model by implementing ImageProvider — the comic renderer does not change.
 */

export type GenerateImageInput = {
  prompt: string;
  panelId: number;
  style?: string;
};

export type GenerateImageResult = {
  bytes: Buffer;
  mimeType: string;
};

export interface ImageProvider {
  readonly id: string;
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
}

export type ImageProviderName = "openai" | "gemini" | "flux";

export type CreateImageProviderOptions = {
  apiKey?: string;
  model?: string;
  /** GPT Image models only: low | medium | high | auto */
  quality?: "low" | "medium" | "high" | "auto";
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
};

/** GPT Image models reject `response_format` and always return `b64_json`. */
export function isGptImageModel(model: string): boolean {
  return model.startsWith("gpt-image") || model.includes("chatgpt-image");
}

function resolveOpenAIImageModel(override?: string): string {
  return (
    override ??
    process.env.OPENAI_IMAGE_MODEL ??
    // Full gpt-image-1 is clearer than mini; override with gpt-image-2 for max quality.
    "gpt-image-1"
  );
}

function resolveOpenAIImageQuality(
  override?: CreateImageProviderOptions["quality"],
): NonNullable<CreateImageProviderOptions["quality"]> {
  const fromEnv = process.env.OPENAI_IMAGE_QUALITY as
    | CreateImageProviderOptions["quality"]
    | undefined;
  return override ?? fromEnv ?? "high";
}

function resolveOpenAIImageSize(
  override?: CreateImageProviderOptions["size"],
): NonNullable<CreateImageProviderOptions["size"]> {
  const fromEnv = process.env.OPENAI_IMAGE_SIZE as
    | CreateImageProviderOptions["size"]
    | undefined;
  return override ?? fromEnv ?? "1024x1024";
}

function requireApiKey(envName: string, override?: string): string {
  const apiKey = override ?? process.env[envName];
  if (!apiKey) {
    throw new Error(`${envName} is not set`);
  }
  return apiKey;
}

function decodeBase64Image(data: string, mimeType: string): GenerateImageResult {
  return {
    bytes: Buffer.from(data, "base64"),
    mimeType,
  };
}

export class OpenAIImageProvider implements ImageProvider {
  readonly id = "openai";

  constructor(
    private readonly options: CreateImageProviderOptions = {},
  ) {}

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: requireApiKey("OPENAI_API_KEY", this.options.apiKey),
    });

    const model = resolveOpenAIImageModel(this.options.model);
    const size = resolveOpenAIImageSize(this.options.size);
    const quality = resolveOpenAIImageQuality(this.options.quality);

    // GPT Image and DALL·E accept different optional fields; cast at the boundary.
    const response = await client.images.generate({
      model,
      prompt: input.prompt,
      n: 1,
      size,
      ...(isGptImageModel(model)
        ? { quality }
        : { response_format: "b64_json" as const }),
    } as Parameters<typeof client.images.generate>[0]);
    const item = response.data?.[0];
    if (item?.b64_json) {
      return decodeBase64Image(item.b64_json, "image/png");
    }

    if (item?.url) {
      const imageResponse = await fetch(item.url);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download OpenAI image (${imageResponse.status})`,
        );
      }
      const mimeType =
        imageResponse.headers.get("content-type") ?? "image/png";
      const arrayBuffer = await imageResponse.arrayBuffer();
      return {
        bytes: Buffer.from(arrayBuffer),
        mimeType,
      };
    }

    throw new Error("OpenAI returned no image data");
  }
}

export class GeminiImageProvider implements ImageProvider {
  readonly id = "gemini";

  constructor(
    private readonly options: CreateImageProviderOptions = {},
  ) {}

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    const apiKey = requireApiKey("GEMINI_API_KEY", this.options.apiKey);
    const model = this.options.model ?? "imagen-3.0-generate-002";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        instances: [{ prompt: input.prompt }],
        parameters: { sampleCount: 1 },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini image generation failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    };
    const prediction = json.predictions?.[0];
    const b64 = prediction?.bytesBase64Encoded;
    if (!b64) {
      throw new Error("Gemini returned no image data");
    }

    return decodeBase64Image(b64, prediction.mimeType ?? "image/png");
  }
}

export class FluxImageProvider implements ImageProvider {
  readonly id = "flux";

  constructor(
    private readonly options: CreateImageProviderOptions = {},
  ) {}

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    const apiKey = requireApiKey("FLUX_API_KEY", this.options.apiKey);
    const model = this.options.model ?? "flux-pro-1.1";
    const createUrl = `https://api.bfl.ai/v1/${model}`;

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "x-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: input.prompt,
        width: 1024,
        height: 1024,
      }),
    });

    if (!createResponse.ok) {
      const body = await createResponse.text();
      throw new Error(`Flux image creation failed (${createResponse.status}): ${body}`);
    }

    const created = (await createResponse.json()) as {
      id?: string;
      polling_url?: string;
    };

    const pollingUrl = created.polling_url;
    if (!pollingUrl) {
      throw new Error("Flux returned no polling URL");
    }

    const imageUrl = await this.pollForResult(pollingUrl, apiKey);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download Flux image (${imageResponse.status})`);
    }

    const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await imageResponse.arrayBuffer();

    return {
      bytes: Buffer.from(arrayBuffer),
      mimeType,
    };
  }

  private async pollForResult(pollingUrl: string, apiKey: string): Promise<string> {
    const maxAttempts = 30;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(pollingUrl, {
        headers: {
          accept: "application/json",
          "x-key": apiKey,
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Flux polling failed (${response.status}): ${body}`);
      }

      const json = (await response.json()) as {
        status?: string;
        result?: { sample?: string };
      };

      if (json.status === "Ready" && json.result?.sample) {
        return json.result.sample;
      }

      if (json.status === "Error" || json.status === "Failed") {
        throw new Error(`Flux generation failed with status: ${json.status}`);
      }

      await sleep(1000);
    }

    throw new Error("Flux generation timed out");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createImageProvider(
  name: ImageProviderName,
  options: CreateImageProviderOptions = {},
): ImageProvider {
  switch (name) {
    case "openai":
      return new OpenAIImageProvider(options);
    case "gemini":
      return new GeminiImageProvider(options);
    case "flux":
      return new FluxImageProvider(options);
    default: {
      const exhaustive: never = name;
      throw new Error(`Unsupported image provider: ${String(exhaustive)}`);
    }
  }
}
