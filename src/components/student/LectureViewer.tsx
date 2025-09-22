import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Image,
  Video,
  FileAudio,
  Download,
  BookOpen
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  transcript: string | null;
  audio_url: string | null;
  created_at: string;
  teacher_id: string;
}

interface LectureFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  is_primary: boolean;
}

interface LectureViewerProps {
  lectureId: string;
  onBack: () => void;
}

export const LectureViewer = ({ lectureId, onBack }: LectureViewerProps) => {
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [files, setFiles] = useState<LectureFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLectureData();
  }, [lectureId]);

  const fetchLectureData = async () => {
    try {
      // Fetch lecture details
      const { data: lectureData, error: lectureError } = await supabase
        .from('lectures')
        .select('*')
        .eq('id', lectureId)
        .eq('status', 'published')
        .single();

      if (lectureError) throw lectureError;
      setLecture(lectureData);

      // Note: lecture_files table integration pending database schema update

    } catch (error) {
      console.error('Error fetching lecture:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lecture content',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('lecture-files')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDownload = async (file: LectureFile) => {
    try {
      const url = await getFileUrl(file.file_path);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Download started',
        description: `Downloading ${file.file_name}`
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Download failed',
        description: 'Unable to download file',
        variant: 'destructive'
      });
    }
  };

  const renderFilePreview = (file: LectureFile) => {
    if (file.mime_type.startsWith('image/')) {
      return (
        <img 
          src={`${supabase.storage.from('lecture-files').getPublicUrl(file.file_path).data.publicUrl}`}
          alt={file.file_name}
          className="max-w-full max-h-96 object-contain rounded border"
        />
      );
    }
    
    if (file.mime_type.startsWith('audio/')) {
      return (
        <audio controls className="w-full">
          <source 
            src={`${supabase.storage.from('lecture-files').getPublicUrl(file.file_path).data.publicUrl}`}
            type={file.mime_type}
          />
          Your browser does not support the audio element.
        </audio>
      );
    }
    
    if (file.mime_type.startsWith('video/')) {
      return (
        <video controls className="w-full max-h-96">
          <source 
            src={`${supabase.storage.from('lecture-files').getPublicUrl(file.file_path).data.publicUrl}`}
            type={file.mime_type}
          />
          Your browser does not support the video element.
        </video>
      );
    }
    
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/50">
        <div className="text-center">
          {getFileIcon(file.file_type, file.mime_type)}
          <p className="mt-2 text-sm text-muted-foreground">
            Preview not available for this file type
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Lecture Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The lecture you're looking for doesn't exist or isn't published yet.
        </p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lectures
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button onClick={onBack} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lectures
        </Button>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{lecture.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(lecture.created_at).toLocaleDateString()}
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Published
              </Badge>
            </div>
            {lecture.description && (
              <p className="text-muted-foreground mb-4">{lecture.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="notes">My Notes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="space-y-6">
          {/* Main Audio */}
          {lecture.audio_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileAudio className="h-5 w-5" />
                  Main Audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <audio controls className="w-full">
                  <source src={lecture.audio_url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Lecture Files</h3>
              {files.map((file) => (
                <Card key={file.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.file_type, file.mime_type)}
                        <div>
                          <CardTitle className="text-base">{file.file_name}</CardTitle>
                          <CardDescription>
                            {file.mime_type} • {formatFileSize(file.file_size)}
                            {file.is_primary && (
                              <Badge variant="outline" className="ml-2">Primary</Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(file)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renderFilePreview(file)}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {files.length === 0 && !lecture.audio_url && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No content available</h3>
                <p className="text-muted-foreground text-center">
                  This lecture doesn't have any files or audio content yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="transcript" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lecture Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lecture.transcript ? (
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{lecture.transcript}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No transcript available</h3>
                  <p className="text-muted-foreground">
                    This lecture doesn't have a transcript yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Notes
              </CardTitle>
              <CardDescription>
                Take notes while studying this lecture
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Note-taking coming soon</h3>
              <p className="text-muted-foreground">
                Personal note-taking feature will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};