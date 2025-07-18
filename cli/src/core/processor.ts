import path from "path";
import chalk from "chalk";
import { DynamicSpinner, StreamingSpinner } from "../ui/spinner";
import { createGitIgnoreChecker } from "./tools";
import { LLM } from "./llm";

export interface QueryResult {
  query: string;
  response: string;
  suggestions?: string[];
  timestamp: Date;
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface configType {
  LLMConfig: LLMConfig;
  rootDir: string;
  doesExistInGitIgnore: (rootDir: string) => boolean | null;
}

export type SpinnerUpdateCallback = (text: string) => void;

export class Processor {
  private config: configType;
  private currentDir: string | null;
  private LLM: LLM;

  constructor(rootDir: string) {
    this.config = {
      LLMConfig: {
        model: "gemini-2.5-flash",
      },
      rootDir,
      doesExistInGitIgnore: createGitIgnoreChecker(rootDir),
    };
    this.currentDir = rootDir;
    this.LLM = new LLM(this.config.LLMConfig.model);
  }

  async processQuery(query: string, spinner: DynamicSpinner) {
    spinner.updateText("🤖 Connecting to AI model...");
    await new Promise(resolve => setTimeout(resolve, 500));
    
    spinner.updateText("📝 Preparing to generate response...");
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      // Stop the initial spinner
      spinner.stop();
      
      // Display query and response header
      console.log(chalk.blue("\n📝 Query:"), query);
      console.log(chalk.green("✨ Response:"));
      console.log(); // Empty line before response
      
      // Create streaming spinner that stays at bottom
      const streamingSpinner = new StreamingSpinner();
      streamingSpinner.start("🔄 Generating response...");
      
      let wordCount = 0;
      let charCount = 0;
      
      // Stream the response with real-time status updates
      const response = await this.LLM.StreamResponse(query, (chunk: string) => {
        // Clear the spinner line before writing content
        process.stdout.write('\r\x1b[K');
        
        // Write the chunk
        process.stdout.write(chunk);
        
        // Update stats
        charCount += chunk.length;
        if (chunk.includes(' ')) {
          wordCount += chunk.split(' ').length - 1;
        }
        
        // If chunk doesn't end with newline, add one for spinner
        if (!chunk.endsWith('\n')) {
          process.stdout.write('\n');
        }
        
        // Update spinner text with stats
        streamingSpinner.updateText(`Generated ${wordCount} words, ${charCount} characters...`);
      });
      
      // Complete the streaming
      streamingSpinner.succeed("Response completed!");
      
      console.log(chalk.gray(`⏰ Completed at: ${new Date().toLocaleTimeString()}`));
      console.log(chalk.dim(`📊 Total: ${wordCount} words, ${charCount} characters\n`));
      
      return response;
    } catch (error) {
      spinner.fail("❌ Failed to generate response");
      throw new Error("Error processing query: " + error);
    }
  }

  private async getEnvironment() {}
}

// Export tools
export * from "./tools";
