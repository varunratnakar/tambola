// Voice service for Tambola number announcements
class VoiceService {
  deriveLocalBase() {
    const { protocol, hostname, port } = window.location;
    return `${protocol}//${hostname}:4000`;
  }
  
  constructor() {
    this.synth = window.speechSynthesis;
    this.isEnabled = true;
    this.voice = null;
    this.rate = 0.8; // Slightly slower for clarity
    this.pitch = 1.0;
    this.volume = 0.8;
    
    // Mode: 'ai' (ElevenLabs) by default; fallback option 'browser'
    this.mode = 'ai';
    // Cache for AI audio blobs (text -> blobURL)
    this.cache = new Map();
    
    // Load persisted cache from localStorage (if any)
    try {
      const persisted = localStorage.getItem('ttsCache');
      if (persisted) {
        const obj = JSON.parse(persisted);
        Object.entries(obj).forEach(([text, b64]) => {
          const blob = this.base64ToBlob(b64, 'audio/mpeg');
          const url = URL.createObjectURL(blob);
          this.cache.set(text, url);
        });
      }
    } catch (e) {
      console.warn('VoiceService: failed to load persisted TTS cache', e);
    }
    
    // Determine API base (dev vs prod)
    const envBase = import.meta.env.VITE_SERVER_URL || import.meta.env.REACT_APP_API_BASE;
    this.apiBase = envBase ? envBase.replace(/\/$/, '') : this.deriveLocalBase();      
    
    // console.log('VoiceService: Initializing...', {
    //   speechSynthesis: !!window.speechSynthesis,
    //   voicesLength: this.synth?.getVoices()?.length || 0
    // });
    
    // Initialize voice when voices are loaded
    this.initializeVoice();
    
    // Handle voice loading
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        // console.log('VoiceService: Voices changed, reinitializing...');
        this.initializeVoice();
      };
    }
  }

  initializeVoice() {
    const voices = this.synth.getVoices();
    // console.log('VoiceService: Available voices:', voices.length, voices.map(v => `${v.name} (${v.lang})`));
    
    // Prioritize Indian English voices first, then other English voices
    const preferredVoices = [
      // Indian English voices (highest priority)
      'Google हिन्दी',
      'Microsoft Heera - English (India)',
      'Microsoft Ravi - English (India)', 
      'Google English (India)',
      'English (India)',
      'Ravi',
      'Heera',
      // UK English (closer to Indian pronunciation)
      'Google UK English Female',
      'Google UK English Male',
      'Microsoft Hazel - English (Great Britain)',
      'Microsoft George - English (Great Britain)',
      // US English as fallback
      'Microsoft Zira - English (United States)',
      'Google US English',
      'Microsoft David - English (United States)',
      // macOS voices
      'Alex', // macOS default
      'Samantha' // macOS female voice
    ];
    
    // Find the best available voice
    for (const preferredName of preferredVoices) {
      const voice = voices.find(v => 
        v.name.includes(preferredName) || 
        v.name === preferredName ||
        v.lang.includes('en-IN') || // Indian English locale
        (v.lang.includes('hi') && v.name.toLowerCase().includes('english')) // Hindi voices that support English
      );
      if (voice) {
        this.voice = voice;
        break;
      }
    }
    
    // Fallback to any English voice
    if (!this.voice) {
      this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    }
    
    console.log('VoiceService: Selected voice:', this.voice?.name, 'Language:', this.voice?.lang);
  }

  // Traditional Tambola number calls with nicknames - phrase first, then number
  getNumberCall(number) {
    const calls = {
      1: "Kelly's eye, number one",
      2: "One little duck, number two",
      3: "Cup of tea, number three",
      4: "Knock at the door, number four",
      5: "Man alive, number five",
      6: "Half a dozen, number six",
      7: "Lucky seven, number seven",
      8: "Garden gate, number eight",
      9: "Doctor's orders, number nine",
      10: "Cock and hen, number ten",
      11: "Legs eleven, number eleven",
      12: "One dozen, number twelve",
      13: "Unlucky for some, number thirteen",
      14: "Valentine's day, number fourteen",
      15: "Young and keen, number fifteen",
      16: "Sweet sixteen, number sixteen",
      17: "Dancing queen, number seventeen",
      18: "Coming of age, number eighteen",
      19: "Goodbye teens, number nineteen",
      20: "One score, number twenty",
      21: "Key of the door, number twenty-one",
      22: "Two little ducks, number twenty-two",
      23: "Thee and me, number twenty-three",
      24: "Two dozen, number twenty-four",
      25: "Duck and dive, number twenty-five",
      26: "Pick and mix, number twenty-six",
      27: "Gateway to heaven, number twenty-seven",
      28: "In a state, number twenty-eight",
      29: "Rise and shine, number twenty-nine",
      30: "Dirty Gertie, number thirty",
      31: "Get up and run, number thirty-one",
      32: "Buckle my shoe, number thirty-two",
      33: "Dirty knee, number thirty-three",
      34: "Ask for more, number thirty-four",
      35: "Jump and jive, number thirty-five",
      36: "Three dozen, number thirty-six",
      37: "More than eleven, number thirty-seven",
      38: "Christmas cake, number thirty-eight",
      39: "Those famous steps, number thirty-nine",
      40: "Life begins at, number forty",
      41: "Time for fun, number forty-one",
      42: "Winnie the pooh, number forty-two",
      43: "Down on your knee, number forty-three",
      44: "Droopy drawers, number forty-four",
      45: "Halfway there, number forty-five",
      46: "Up to tricks, number forty-six",
      47: "Four and seven, number forty-seven",
      48: "Four dozen, number forty-eight",
      49: "PC, number forty-nine",
      50: "Half a century, number fifty",
      51: "Tweak of the thumb, number fifty-one",
      52: "Deck of cards, number fifty-two",
      53: "Stuck in the tree, number fifty-three",
      54: "Clean the floor, number fifty-four",
      55: "Snakes alive, number fifty-five",
      56: "Was she worth it, number fifty-six",
      57: "Heinz varieties, number fifty-seven",
      58: "Make them wait, number fifty-eight",
      59: "Brighton line, number fifty-nine",
      60: "Three score, number sixty",
      61: "Bakers bun, number sixty-one",
      62: "Tickety-boo, number sixty-two",
      63: "Tickle me, number sixty-three",
      64: "Red raw, number sixty-four",
      65: "Old age pension, number sixty-five",
      66: "Clickety click, number sixty-six",
      67: "Made in heaven, number sixty-seven",
      68: "Saving grace, number sixty-eight",
      69: "Either way up, number sixty-nine",
      70: "Three score and ten, number seventy",
      71: "Bang on the drum, number seventy-one",
      72: "Six dozen, number seventy-two",
      73: "Queen bee, number seventy-three",
      74: "Candy store, number seventy-four",
      75: "Strive and strive, number seventy-five",
      76: "Trombones, number seventy-six",
      77: "Sunset strip, number seventy-seven",
      78: "Heaven's gate, number seventy-eight",
      79: "One more time, number seventy-nine",
      80: "Eight and oh, number eighty",
      81: "Stop and run, number eighty-one",
      82: "Straight on through, number eighty-two",
      83: "Time for tea, number eighty-three",
      84: "Seven dozen, number eighty-four",
      85: "Staying alive, number eighty-five",
      86: "Between the sticks, number eighty-six",
      87: "Torquay in Devon, number eighty-seven",
      88: "Two fat ladies, number eighty-eight",
      89: "Nearly there, number eighty-nine",
      90: "Top of the shop, number ninety"
    };
    
    return calls[number] || `Number ${number}`;
  }

  // Announce a number with exciting Tambola style
  announceNumber(number) {
    // console.log('VoiceService: announceNumber called', {
    //   number,
    //   isEnabled: this.isEnabled,
    //   hasSynth: !!this.synth,
    //   hasVoice: !!this.voice,
    //   voiceName: this.voice?.name
    // });
    
    if (!this.isEnabled) {
      // console.log('VoiceService: Announcement skipped - service disabled or no synth');
      return;
    }
    
    // AI mode
    if (this.mode === 'ai') {
      const text = this.getNumberCall(number);
      this.speakAI(text);
      return;
    }
    
    // Browser speech mode requires synth support
    if (!this.synth) return;
    
    // Cancel any ongoing speech
    this.synth.cancel();
    
    // Chrome fix: Sometimes speech synthesis gets stuck, this helps reset it
    if (this.synth.speaking || this.synth.pending) {
      // console.log('VoiceService: Synthesis appears stuck, attempting reset...');
      this.synth.cancel();
      // Small delay to ensure cancellation completes
      setTimeout(() => {
        this.continueAnnouncement(number);
      }, 100);
      return;
    }
    
    this.continueAnnouncement(number);
  }
  
  continueAnnouncement(number) {
    // console.log('VoiceService: continueAnnouncement called', { number });
    
    const baseCall = this.getNumberCall(number);
    
    // Simple announcement with just the traditional Tambola call
    // Use exciting tone through voice settings rather than extra words
    const utterance = new SpeechSynthesisUtterance(baseCall);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    // Make it exciting through voice modulation
    utterance.rate = this.rate * 0.85; // Slightly slower for clarity and drama
    utterance.pitch = this.pitch + 0.15; // Higher pitch for excitement
    utterance.volume = this.volume;
    
    // utterance.onstart = () => {
    //   console.log('VoiceService: Announcement started', { number, text: baseCall });
    // };
    
    // utterance.onend = () => {
    //   console.log('VoiceService: Announcement ended', { number, text: baseCall });
    // };
    
    // utterance.onerror = (event) => {
    //   console.error('VoiceService: Announcement error', { 
    //     error: event.error, 
    //     number, 
    //     text: baseCall 
    //   });
    // };
    
    // console.log('VoiceService: Speaking announcement...', {
    //   text: baseCall,
    //   synthSpeaking: this.synth.speaking,
    //   synthPending: this.synth.pending,
    //   synthPaused: this.synth.paused
    // });
    
    // Check if synthesis is stuck and try to resume
    if (this.synth.paused) {
      // console.log('VoiceService: Synthesis was paused, resuming...');
      this.synth.resume();
    }
    
    this.synth.speak(utterance);
  }
  
  // Speak a sequence of text parts with different settings and pauses
  speakSequence(parts, index) {
    // console.log('VoiceService: speakSequence called', { index, totalParts: parts.length, text: parts[index]?.text });
    
    if (index >= parts.length) {
      // console.log('VoiceService: speakSequence completed');
      return;
    }
    
    const part = parts[index];
    const utterance = new SpeechSynthesisUtterance(part.text);
    
    // console.log('VoiceService: Creating utterance', {
    //   text: part.text,
    //   rate: part.rate,
    //   pitch: part.pitch,
    //   hasVoice: !!this.voice
    // });
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    utterance.rate = Math.min(2.0, Math.max(0.1, part.rate));
    utterance.pitch = Math.min(2.0, Math.max(0, part.pitch));
    utterance.volume = this.volume;
    
    // When this part finishes, wait and then speak the next part
    utterance.onend = () => {
      // console.log('VoiceService: Utterance ended', { index, text: part.text });
      if (part.pause > 0) {
        setTimeout(() => {
          this.speakSequence(parts, index + 1);
        }, part.pause);
      } else {
        this.speakSequence(parts, index + 1);
      }
    };
    
    // utterance.onerror = (event) => {
    //   console.error('VoiceService: Utterance error', { 
    //     error: event.error, 
    //     text: part.text, 
    //     index 
    //   });
    // };
    
    // utterance.onstart = () => {
    //   console.log('VoiceService: Utterance started', { index, text: part.text });
    // };
    
    // console.log('VoiceService: Speaking utterance...', {
    //   synthSpeaking: this.synth.speaking,
    //   synthPending: this.synth.pending,
    //   synthPaused: this.synth.paused
    // });
    
    // Check if synthesis is stuck and try to resume
    if (this.synth.paused) {
      // console.log('VoiceService: Synthesis was paused, resuming...');
      this.synth.resume();
    }
    
    this.synth.speak(utterance);
  }

  // Announce game events
  announceEvent(message) {
    if (!this.isEnabled) return;

    if (this.mode === 'ai') {
      this.speakAI(message);
      return;
    }

    if (!this.synth) return;

    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    if (this.voice) {
      utterance.voice = this.voice;
    }

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    this.synth.speak(utterance);
  }

  // Control methods
  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
    this.synth.cancel();
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.synth.cancel();
    }
    return this.isEnabled;
  }

  setRate(rate) {
    this.rate = Math.max(0.1, Math.min(2.0, rate));
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Check if speech synthesis is supported
  isSupported() {
    if (this.mode === 'ai') return true;
    return 'speechSynthesis' in window;
  }

  // Get available voices
  getAvailableVoices() {
    if (!this.isSupported()) return [];
    
    const voices = this.synth.getVoices();
    // Filter for English voices and sort by preference
    const englishVoices = voices.filter(voice => 
      voice.lang.startsWith('en') || 
      voice.lang.includes('hi') ||
      voice.name.toLowerCase().includes('english')
    );
    
    // Sort by preference: Indian English first, then UK, then US
    return englishVoices.sort((a, b) => {
      const aIsIndian = a.lang.includes('en-IN') || a.name.toLowerCase().includes('india');
      const bIsIndian = b.lang.includes('en-IN') || b.name.toLowerCase().includes('india');
      const aIsUK = a.lang.includes('en-GB') || a.name.toLowerCase().includes('uk') || a.name.toLowerCase().includes('britain');
      const bIsUK = b.lang.includes('en-GB') || b.name.toLowerCase().includes('uk') || b.name.toLowerCase().includes('britain');
      
      if (aIsIndian && !bIsIndian) return -1;
      if (!aIsIndian && bIsIndian) return 1;
      if (aIsUK && !bIsUK) return -1;
      if (!aIsUK && bIsUK) return 1;
      return 0;
    });
  }

  // Set voice by name
  setVoice(voiceName) {
    const voices = this.synth.getVoices();
    const selectedVoice = voices.find(v => v.name === voiceName);
    if (selectedVoice) {
      this.voice = selectedVoice;
      // console.log('Voice changed to:', this.voice.name, 'Language:', this.voice.lang);
    }
  }

  // Refresh available voices (useful when voices load asynchronously)
  refreshVoices() {
    this.initializeVoice();
    return this.getStatus();
  }

  // Get current status
  getStatus() {
    return {
      isSupported: this.isSupported(),
      isEnabled: this.isEnabled,
      currentVoice: this.voice?.name || 'Default',
      currentVoiceLang: this.voice?.lang || 'Unknown',
      rate: this.rate,
      volume: this.volume,
      mode: this.mode,
      availableVoices: this.getAvailableVoices()
    };
  }

  // Test function to debug voice issues
  testVoice() {
    // console.log('VoiceService: Testing voice...');
    
    if (!this.isSupported()) {
      // console.error('VoiceService: Speech synthesis not supported');
      return false;
    }
    
    if (!this.isEnabled) {
      // console.log('VoiceService: Voice is disabled');
      return false;
    }
    
    try {
      const utterance = new SpeechSynthesisUtterance('Testing voice');
      
      if (this.voice) {
        utterance.voice = this.voice;
      }
      
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;
      
      utterance.onstart = () => console.log('VoiceService: Test utterance started');
      utterance.onend = () => console.log('VoiceService: Test utterance ended');
      utterance.onerror = (e) => console.error('VoiceService: Test utterance error', e);
      
      this.synth.speak(utterance);
      return true;
    } catch (error) {
      console.error('VoiceService: Test failed with exception', error);
      return false;
    }
  }

  /* ------------------------------ AI MODE HELPERS ----------------------------- */
  async speakAI(text) {
    try {
      // Return early if already playing same text quickly? not needed now.
      if (this.cache.has(text)) {
        const url = this.cache.get(text);
        new Audio(url).play();
        return;
      }

      const res = await fetch(`${this.apiBase}/api/tts/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        console.error('VoiceService: AI TTS fetch failed', res.status);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      this.cache.set(text, url);
      this.persistCacheEntry(text, blob);
      new Audio(url).play();
    } catch (err) {
      console.error('VoiceService: AI speak error', err);
    }
  }

  setMode(mode) {
    this.mode = mode === 'ai' ? 'ai' : 'browser';
    if (this.mode === 'ai') {
      this.prefetchNumberCalls();
    }
  }

  base64ToBlob(b64, mime) {
    const byteChars = atob(b64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }

  blobToBase64(blob) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result; // data:audio/mpeg;base64,...
        const base64 = dataUrl.split(',')[1];
        res(base64);
      };
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  }

  async persistCacheEntry(text, blob) {
    try {
      const base64 = await this.blobToBase64(blob);
      const existing = JSON.parse(localStorage.getItem('ttsCache') || '{}');
      existing[text] = base64;
      localStorage.setItem('ttsCache', JSON.stringify(existing));
    } catch (e) {
      // Storage quota exceeded or other error – ignore
      console.warn('VoiceService: could not persist TTS cache', e);
    }
  }

  // Prefetch Tambola number calls (1-90)
  async prefetchNumberCalls() {
    const numbers = Array.from({ length: 90 }, (_, i) => i + 1);
    // Simple sequential fetch with 1-2 s gap to avoid hammering API
    for (const n of numbers) {
      const text = this.getNumberCall(n);
      if (this.cache.has(text)) continue;
      try {
        await this.speakAIPrefetch(text);
      } catch (_) {}
      await new Promise(r => setTimeout(r, 800)); // 0.8 s between calls
    }
  }

  async speakAIPrefetch(text) {
    const res = await fetch(`${this.apiBase}/api/tts/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    this.cache.set(text, url);
    this.persistCacheEntry(text, blob);
  }
}

// Create and export a singleton instance
const voiceService = new VoiceService();
export default voiceService; 