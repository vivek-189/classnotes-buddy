import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Mic, 
  Square, 
  Play, 
  Pause,
  File,
  CheckCircle,
  FileText,
  Image,
  Video,
  FileAudio,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const LectureUpload = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptSegment + ' ';
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        setTranscript(''); // Clear previous transcript
      }
      
      toast({
        title: 'Recording started',
        description: 'Speak clearly into your microphone. Live transcription is active.'
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording failed',
        description: 'Please check your microphone permissions',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop speech recognition
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      
      toast({
        title: 'Recording stopped',
        description: 'You can now review your recording and transcript'
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      
      toast({
        title: 'Files selected',
        description: `Added ${files.length} file${files.length > 1 ? 's' : ''}`
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (file.type.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
    if (file.type.includes('pdf') || file.type.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your lecture',
        variant: 'destructive'
      });
      return;
    }

    if (uploadedFiles.length === 0 && !audioBlob) {
      toast({
        title: 'Content required',
        description: 'Please record audio or upload files for your lecture',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create lecture record
      const { data: lecture, error: lectureError } = await supabase
        .from('lectures')
        .insert({
          teacher_id: user?.id,
          title: title.trim(),
          description: description.trim() || null,
          transcript: transcript.trim() || null,
          status: 'draft'
        })
        .select()
        .single();

      if (lectureError) throw lectureError;

      setUploadProgress(30);

      // Upload files to storage
      const fileUploads = [];
      
      // Upload recorded audio if exists
      if (audioBlob) {
        const audioFileName = `recording-${Date.now()}.webm`;
        // Create a file-like object for upload
        const audioFileForUpload = new Blob([audioBlob], { type: 'audio/webm' });
        Object.defineProperty(audioFileForUpload, 'name', {
          value: audioFileName,
          writable: false
        });
        fileUploads.push(audioFileForUpload as File);
      }

      // Add uploaded files
      fileUploads.push(...uploadedFiles);

      // Upload each file
      const uploadedUrls = [];
      for (let i = 0; i < fileUploads.length; i++) {
        const file = fileUploads[i];
        const fileName = `${lecture.id}/${Date.now()}-${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lecture-files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        uploadedUrls.push(uploadData.path);
        setUploadProgress(30 + ((i + 1) / fileUploads.length) * 60);
      }

      // Update lecture with first uploaded file URL (for primary content)
      if (uploadedUrls.length > 0) {
        const { data } = await supabase.storage
          .from('lecture-files')
          .getPublicUrl(uploadedUrls[0]);

        await supabase
          .from('lectures')
          .update({ audio_url: data.publicUrl })
          .eq('id', lecture.id);
      }

      setUploadProgress(100);

      toast({
        title: 'Lecture uploaded successfully!',
        description: 'Your lecture has been saved as a draft. You can publish it from the lecture management page.'
      });

      // Reset form
      setTitle('');
      setDescription('');
      setUploadedFiles([]);
      setAudioBlob(null);
      setAudioUrl(null);
      setTranscript('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Error uploading lecture:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your lecture. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Lecture</h1>
        <p className="text-muted-foreground">
          Record audio, upload any files, and create AI-powered lecture content
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lecture Details */}
        <Card>
          <CardHeader>
            <CardTitle>Lecture Details</CardTitle>
            <CardDescription>
              Basic information about your lecture
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter lecture title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the lecture content"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Lecture Content</CardTitle>
            <CardDescription>
              Record live audio with speech-to-text or upload any type of files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recording Controls */}
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                className="gap-2"
              >
                {isRecording ? (
                  <>
                    <Square className="h-4 w-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Start Recording
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Files
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Live Transcript */}
            {(isRecording || transcript) && (
              <div className="space-y-2">
                <Label>Live Transcript</Label>
                <div className="p-4 border rounded-lg bg-muted/50 min-h-[100px]">
                  {isListening && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      Listening...
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">
                    {transcript || 'Start speaking to see live transcription...'}
                  </p>
                </div>
              </div>
            )}

            {/* Audio Preview */}
            {audioUrl && (
              <div className="space-y-2">
                <Label>Recorded Audio</Label>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <FileAudio className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Recorded Audio</p>
                    <audio controls className="w-full mt-2">
                      <source src={audioUrl} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files ({uploadedFiles.length})</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {file.type || 'Unknown type'} • {formatFileSize(file.size)}
                        </p>
                        {/* File Preview for Images */}
                        {file.type.startsWith('image/') && (
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={file.name}
                            className="mt-2 max-w-32 max-h-20 object-cover rounded border"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isRecording && (
              <Alert>
                <Mic className="h-4 w-4" />
                <AlertDescription>
                  Recording in progress with live transcription... Speak clearly into your microphone.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Upload Progress</Label>
                  <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full" 
          disabled={uploading || (uploadedFiles.length === 0 && !audioBlob)}
        >
          {uploading ? (
            'Processing Lecture...'
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Create Lecture
            </>
          )}
        </Button>
      </form>
    </div>
  );
};