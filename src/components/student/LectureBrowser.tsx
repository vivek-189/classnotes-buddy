import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  Play, 
  Search,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  teacher_id: string;
}

export const LectureBrowser = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [filteredLectures, setFilteredLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchLectures();
  }, []);

  useEffect(() => {
    filterLectures();
  }, [lectures, searchTerm]);

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLectures(data || []);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lectures',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLectures = () => {
    if (!searchTerm.trim()) {
      setFilteredLectures(lectures);
      return;
    }

    const filtered = lectures.filter(lecture =>
      lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lecture.description && lecture.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredLectures(filtered);
  };

  const handleLectureClick = (lectureId: string) => {
    // This would navigate to the lecture detail view
    console.log('Navigate to lecture:', lectureId);
    toast({
      title: 'Coming Soon',
      description: 'Lecture viewer will be available soon!'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Available Lectures</h1>
          <p className="text-muted-foreground">
            Browse and study from published lectures
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search lectures..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredLectures.length} lecture{filteredLectures.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Lectures Grid */}
      {filteredLectures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? 'No matching lectures found' : 'No lectures available yet'}
            </h3>
            <p className="text-muted-foreground text-center">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Your teachers haven\'t published any lectures yet. Check back soon!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLectures.map((lecture) => (
            <Card 
              key={lecture.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleLectureClick(lecture.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{lecture.title}</CardTitle>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Play className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {lecture.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {lecture.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    Published {new Date(lecture.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Duration: Coming soon
                  </div>
                </div>

                <Button className="w-full mt-4" size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Start Learning
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};