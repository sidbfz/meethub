'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  User, 
  Plus,
  X,
  Upload,
  ArrowLeft,
  Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';

// Portfolio Demo: Disable real profile editing
const DEMO_MODE = true;

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
}

interface Props {
  profile: ProfileData;
}

export default function EditProfileForm({ profile }: Props) {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    bio: profile.bio || '',
    interests: profile.interests || [],
    avatar_url: profile.avatar_url || ''
  });
  const [newInterest, setNewInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(interest => interest !== interestToRemove)
    }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setUploadingAvatar(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl
      }));

      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (DEMO_MODE) {
      // Demo Mode: Simulate profile update
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        toast.success('Profile updated successfully (Demo Mode)');
        // Don't actually navigate, just show success message
      }, 1500);
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          interests: formData.interests,
          avatar_url: formData.avatar_url
        })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      toast.success('Profile updated successfully');
      router.push(`/profile/${profile.id}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Edit Profile</CardTitle>
            <Link href={`/profile/${profile.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Demo Mode Notice */}
          {DEMO_MODE && (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Demo Mode:</strong> Profile editing is disabled for portfolio demonstration. 
                Changes will appear to save but won't persist.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Avatar Section */}
          <div className="space-y-4">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </Avatar>
              
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={uploadingAvatar}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </Button>
                <p className="text-sm text-gray-500 mt-1">
                  Maximum file size: 5MB
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-gray-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>
          </div>

          <Separator />

          {/* Interests */}
          <div className="space-y-4">
            <Label>Interests & Hobbies</Label>
            
            {/* Add Interest */}
            <div className="flex gap-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add an interest..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInterest();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddInterest}
                disabled={!newInterest.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Interest Tags */}
            {formData.interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.interests.map((interest, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            
            <Link href={`/profile/${profile.id}`}>
              <Button variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
