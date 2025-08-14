import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Check, X, Clock, FileText } from 'lucide-react';

type DocumentType = 'aadhaar' | 'driving_license' | 'vehicle_rc';
type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface Document {
  id: string;
  document_type: DocumentType;
  document_url: string;
  verification_status: VerificationStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
  driver_id?: string;
  verified_at?: string | null;
  verified_by?: string | null;
}

const documentLabels = {
  aadhaar: 'Aadhaar Card',
  driving_license: 'Driving License',
  vehicle_rc: 'Vehicle Registration Certificate'
};

const KYCDocumentUpload: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocumentType | null>(null);

  useEffect(() => {
    if (user?.id) fetchDocuments();
  }, [user?.id]);

  const fetchDocuments = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as Document[]) || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, documentType: DocumentType) => {
    if (!user?.id) return;

    setUploading(documentType);
    try {
      const fileExt = file.name.split('.').pop();
      if (!fileExt) throw new Error("Invalid file name");

      const fileName = `${user.id}/${documentType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('driver_documents')
        .upsert({
          driver_id: user.id,
          document_type: documentType,
          document_url: publicUrl,
          verification_status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: `${documentLabels[documentType]} uploaded successfully`
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, documentType: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload JPG, PNG, or PDF files only",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    uploadDocument(file, documentType);
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><Check className="w-3 h-3" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><X className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    }
  };

  const getDocumentForType = (type: DocumentType) => documents.find(doc => doc.document_type === type);

  if (loading) return <div className="p-6">Loading documents...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">KYC Document Verification</h2>
        <p className="text-muted-foreground">
          Upload your documents for verification. All documents are required to start accepting rides.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {(['aadhaar', 'driving_license', 'vehicle_rc'] as DocumentType[]).map(docType => {
          const existingDoc = getDocumentForType(docType);
          const isUploading = uploading === docType;

          return (
            <Card key={docType}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {documentLabels[docType]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {existingDoc ? (
                  <div className="space-y-3">
                    {getStatusBadge(existingDoc.verification_status)}

                    {existingDoc.verification_status === 'rejected' && existingDoc.rejection_reason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {existingDoc.rejection_reason}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(existingDoc.document_url, '_blank')}
                      >
                        View Document
                      </Button>

                      {existingDoc.verification_status === 'rejected' && (
                        <>
                          <Input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={e => handleFileChange(e, docType)}
                            disabled={isUploading}
                            className="hidden"
                            id={`reupload-${docType}`}
                          />
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => document.getElementById(`reupload-${docType}`)?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? 'Uploading...' : 'Re-upload Document'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Upload a clear photo or PDF of your {documentLabels[docType].toLowerCase()}
                    </p>
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => handleFileChange(e, docType)}
                      disabled={isUploading}
                      className="hidden"
                      id={`upload-${docType}`}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById(`upload-${docType}`)?.click()}
                      disabled={isUploading}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload Document'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <p>Documents uploaded: {documents.length}/3</p>
              <p>Approved: {documents.filter(d => d.verification_status === 'approved').length}/3</p>
              {documents.length === 3 && documents.every(d => d.verification_status === 'approved') && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  ✅ All documents verified! You can now start accepting rides.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCDocumentUpload;
