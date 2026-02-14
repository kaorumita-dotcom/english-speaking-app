// Type declaration for webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
    SpeechRecognition: typeof SpeechRecognition;
  }
}

export class WebSpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private transcript: string = "";
  private startTime: number = 0;
  private isRunning: boolean = false;
  private onProgressCallback: ((text: string) => void) | null = null;
  private resolveStop: ((result: { transcript: string; duration: number }) => void) | null = null;
  private rejectStop: ((error: Error) => void) | null = null;

  /**
   * Check if Web Speech API is supported in the current browser
   */
  static isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Start speech recognition
   * @param onProgress Callback function called with interim results
   * @returns Promise that resolves when stop() is called
   */
  async start(onProgress: (text: string) => void): Promise<void> {
    if (!WebSpeechRecognizer.isSupported()) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    if (this.isRunning) {
      throw new Error('Recognition is already running');
    }

    // Create recognition instance
    const SpeechRecognitionConstructor =
      window.webkitSpeechRecognition || window.SpeechRecognition;
    this.recognition = new SpeechRecognitionConstructor();

    // Configure recognition
    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.onProgressCallback = onProgress;
    this.transcript = "";
    this.startTime = Date.now();
    this.isRunning = true;

    // Handle recognition results
    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.transcript += finalTranscript;
      }

      // Call progress callback with current text
      const currentText = this.transcript + interimTranscript;
      if (this.onProgressCallback) {
        this.onProgressCallback(currentText.trim());
      }
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      // Ignore 'no-speech' errors as they're expected during pauses
      if (event.error === 'no-speech') {
        return;
      }

      // For other errors, stop recognition
      this.isRunning = false;
      if (this.rejectStop) {
        this.rejectStop(new Error(`Speech recognition error: ${event.error}`));
        this.rejectStop = null;
      }
    };

    // Handle unexpected end (e.g., network issues)
    this.recognition.onend = () => {
      // If we're still supposed to be running, restart (for continuous recognition)
      if (this.isRunning && this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
          this.isRunning = false;
        }
      }
    };

    // Start recognition
    try {
      this.recognition.start();
    } catch (e) {
      this.isRunning = false;
      throw new Error(`Failed to start recognition: ${e}`);
    }
  }

  /**
   * Stop speech recognition and return the final transcript
   */
  async stop(): Promise<{ transcript: string; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.isRunning || !this.recognition) {
        resolve({
          transcript: this.transcript.trim(),
          duration: Math.floor((Date.now() - this.startTime) / 1000),
        });
        return;
      }

      this.resolveStop = resolve;
      this.rejectStop = reject;

      this.isRunning = false;

      // Stop recognition
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }

      // Resolve after a short delay to ensure final results are processed
      setTimeout(() => {
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.resolveStop) {
          this.resolveStop({
            transcript: this.transcript.trim(),
            duration,
          });
          this.resolveStop = null;
        }
      }, 500);
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.recognition = null;
    }
    this.isRunning = false;
    this.transcript = "";
    this.onProgressCallback = null;
    this.resolveStop = null;
    this.rejectStop = null;
  }

  /**
   * Check if recognition is currently running
   */
  get running(): boolean {
    return this.isRunning;
  }
}
