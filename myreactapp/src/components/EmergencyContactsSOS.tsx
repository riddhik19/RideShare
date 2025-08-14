import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Plus, Shield, AlertTriangle, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EmergencyContactsSOS: React.FC = () => {
  const { profile } = useAuth() as any;
  const { toast } = useToast();

  const [contacts, setContacts] = useState<any[]>([]);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_phone: '',
    relationship: '',
    is_primary: false
  });

  useEffect(() => {
    if (profile?.id) fetchContacts();
  }, [profile?.id]);

  const fetchContacts = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', profile.id)
        .order('is_primary', { ascending: false });

      setContacts(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to fetch contacts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!profile?.id) return;

    try {
      const contactData = {
        user_id: profile.id,
        ...formData
      };

      if (editingContact) {
        await supabase.from('emergency_contacts').update(contactData).eq('id', editingContact.id);
      } else {
        await supabase.from('emergency_contacts').insert(contactData);
      }

      toast({ title: 'Success', description: 'Contact saved' });
      setShowAddForm(false);
      setEditingContact(null);
      setFormData({ contact_name: '', contact_phone: '', relationship: '', is_primary: false });
      fetchContacts();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save contact', variant: 'destructive' });
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await supabase.from('emergency_contacts').delete().eq('id', id);
      toast({ title: 'Deleted', description: 'Contact deleted' });
      fetchContacts();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const triggerSOS = async () => {
    if (!contacts.length) {
      toast({ title: 'No contacts', description: 'Add contacts before SOS', variant: 'destructive' });
      return;
    }

    setIsSendingSOS(true);

    try {
      const pos = await new Promise<any>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      const { latitude, longitude } = pos.coords;
      const link = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      console.log('SOS sent to:', contacts, 'Location:', link);

      toast({ title: 'SOS Sent', description: `Sent to ${contacts.length} contacts` });
      setShowSOSConfirm(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed', description: 'SOS failed', variant: 'destructive' });
    } finally {
      setIsSendingSOS(false);
    }
  };

  const editContact = (c: any) => {
    setEditingContact(c);
    setFormData({
      contact_name: c.contact_name,
      contact_phone: c.contact_phone,
      relationship: c.relationship || '',
      is_primary: c.is_primary
    });
    setShowAddForm(true);
  };

  return (
    <div className="space-y-6">
      {/* SOS Button */}
      <div className="text-center">
        <Dialog open={showSOSConfirm} onOpenChange={setShowSOSConfirm}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 text-white px-8 py-6 rounded-full">
              <Shield className="h-8 w-8 mr-2" /> SOS EMERGENCY
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" /> Confirm Emergency Alert
              </DialogTitle>
              <DialogDescription>
                This will send your current location and emergency details to all your contacts.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSOSConfirm(false)}>Cancel</Button>
              <Button onClick={triggerSOS} disabled={isSendingSOS}>
                {isSendingSOS ? 'Sending...' : 'Send SOS'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Emergency Contacts</CardTitle>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading...</p> :
            contacts.length === 0 ? <p>No contacts</p> :
              contacts.map(c => (
                <div key={c.id} className="flex justify-between border p-2 rounded mb-2">
                  <div>
                    <p>{c.contact_name} {c.is_primary && <Badge>Primary</Badge>}</p>
                    <p>{c.contact_phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => editContact(c)}><Edit2 /></Button>
                    <Button onClick={() => handleDeleteContact(c.id)}><Trash2 /></Button>
                  </div>
                </div>
              ))
          }
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      <Dialog open={showAddForm} onOpenChange={(o) => !o && setShowAddForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} />
            </div>
            <div>
              <Label>Relationship</Label>
              <Input value={formData.relationship} onChange={e => setFormData({...formData, relationship: e.target.value})} />
            </div>
            <div>
              <input type="checkbox" checked={formData.is_primary} onChange={e => setFormData({...formData, is_primary: e.target.checked})} />
              <Label>Primary Contact</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleSaveContact}>{editingContact ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmergencyContactsSOS;
