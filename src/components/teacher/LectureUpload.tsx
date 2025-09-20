import { useState, useRef } from 'react';
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
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const LectureUpload = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

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
      
      toast({
        title: 'Recording started',
        description: 'Speak clearly into your microphone'
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
      
      toast({
        title: 'Recording stopped',
        description: 'You can now review your recording'
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
        setAudioBlob(null);
        
        toast({
          title: 'File selected',
          description: `Selected: ${file.name}`
        });
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please select an audio file',
          variant: 'destructive'
        });
      }
    }
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

    if (!audioFile && !audioBlob) {
      toast({
        title: 'Audio required',
        description: 'Please record or upload an audio file',
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
          status: 'draft'
        })
        .select()
        .single();

      if (lectureError) throw lectureError;

      setUploadProgress(50);

      // Here you would typically:
      // 1. Upload the audio file to storage
      // 2. Send it to an AI service for transcription
      // 3. Generate summaries and flashcards
      // For now, we'll just save the basic lecture info

      setUploadProgress(100);

      toast({
        title: 'Lecture uploaded successfully!',
        description: 'Your lecture has been saved as a draft. You can edit and publish it later.'
      });

      // Reset form
      setTitle('');
      setDescription('');
      setAudioFile(null);
      setAudioBlob(null);
      setAudioUrl(null);
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
        <h1 className="text-3xl font-bold">Upload New Lecture</h1>
        <p className="text-muted-foreground">
          Record or upload audio to create AI-powered lecture notes
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

        {/* Audio Input */}
        <Card>
          <CardHeader>
            <CardTitle>Audio Content</CardTitle>
            <CardDescription>
              Record live or upload an existing audio file
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
                Upload File
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Audio Preview */}
            {audioUrl && (
              <div className="space-y-2">
                <Label>Audio Preview</Label>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {audioFile ? audioFile.name : 'Recorded Audio'}
                    </p>
                    <audio controls className="w-full mt-2">
                      <source src={audioUrl} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </div>
            )}

            {isRecording && (
              <Alert>
                <Mic className="h-4 w-4" />
                <AlertDescription>
                  Recording in progress... Speak clearly into your microphone.
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
          disabled={uploading || (!audioFile && !audioBlob)}
        >
          {uploading ? (
            'Processing Lecture...'
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Lecture
            </>
          )}
        </Button>
      </form>
    </div>
  );
};