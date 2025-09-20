import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Clock, 
  Play,
  Star,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StudentStats {
  available_lectures: number;
  completed_notes: number;
  recent_lectures: any[];
  recommended_lectures: any[];
}

interface StudentDashboardProps {
  onNavigate: (page: string, lectureId?: string) => void;
}

export const StudentDashboard = ({ onNavigate }: StudentDashboardProps) => {
  const [stats, setStats] = useState<StudentStats>({
    available_lectures: 0,
    completed_notes: 0,
    recent_lectures: [],
    recommended_lectures: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetch published lectures
      const { data: lectures, error: lecturesError } = await supabase
        .from('lectures')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (lecturesError) throw lecturesError;

      // Fetch student notes
      const { data: notes, error: notesError } = await supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', user?.id);

      if (notesError) throw notesError;

      setStats({
        available_lectures: lectures?.length || 0,
        completed_notes: notes?.length || 0,
        recent_lectures: lectures?.slice(0, 5) || [],
        recommended_lectures: lectures?.slice(0, 3) || []
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Available Lectures',
      value: stats.available_lectures,
      description: 'Ready to study',
      icon: BookOpen,
      color: 'text-blue-600'
    },
    {
      title: 'My Notes',
      value: stats.completed_notes,
      description: 'Lectures with notes',
      icon: Star,
      color: 'text-yellow-600'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map(i => (
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
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Access your lectures and manage your study materials
          </p>
        </div>
        <Button onClick={() => onNavigate('lectures')} className="gap-2">
          <BookOpen className="h-4 w-4" />
          Browse Lectures
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>
            Jump into your study materials
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button 
            variant="outline" 
            className="justify-start gap-2 h-auto p-4"
            onClick={() => onNavigate('lectures')}
          >
            <BookOpen className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Browse All Lectures</div>
              <div className="text-sm text-muted-foreground">
                Find lectures to study
              </div>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="justify-start gap-2 h-auto p-4"
            onClick={() => onNavigate('notes')}
          >
            <Star className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">My Study Notes</div>
              <div className="text-sm text-muted-foreground">
                Review your saved notes
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Lectures */}
      {stats.recent_lectures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Added Lectures</CardTitle>
            <CardDescription>
              Latest content from your teachers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recent_lectures.map((lecture) => (
                <div 
                  key={lecture.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => onNavigate('lecture', lecture.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{lecture.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {lecture.description || 'No description available'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(lecture.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.available_lectures === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No lectures available yet</h3>
            <p className="text-muted-foreground text-center">
              Your teachers haven't published any lectures yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};