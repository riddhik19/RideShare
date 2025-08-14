import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Row,
  Column,
  Hr,
  Button,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface BookingData {
  id: string;
  booking_reference: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_rating?: number;
  driver_name: string;
  vehicle_details: {
    make: string;
    model: string;
    color: string;
    license_plate: string;
    type: string;
  };
  trip_details: {
    from_city: string;
    to_city: string;
    pickup_location: string;
    departure_date: string;
    departure_time: string;
    estimated_duration: string;
    fare_breakdown: {
      total: number;
    };
  };
  seats_booked: number;
}

interface DriverConfirmationEmailProps {
  booking: BookingData;
}

export const DriverConfirmationEmail = ({ booking }: DriverConfirmationEmailProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating?: number) => {
    if (!rating) return 'New User';
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  };

  const calculateEarnings = (total: number) => {
    // Assuming driver gets 80% of total fare
    return Math.round(total * 0.8);
  };

  return (
    <Html>
      <Head />
      <Preview>New ride booking from {booking.passenger_name} - {booking.trip_details.from_city} to {booking.trip_details.to_city}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>🚗 RideShare Driver</Heading>
            <Text style={confirmationText}>You have a new ride booking!</Text>
          </Section>

          {/* Booking Reference */}
          <Section style={referenceSection}>
            <Text style={referenceLabel}>Booking Reference</Text>
            <Text style={referenceNumber}>{booking.booking_reference}</Text>
          </Section>

          <Hr style={divider} />

          {/* Trip Details */}
          <Section>
            <Heading style={sectionTitle}>Trip Details</Heading>
            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>Booking ID:</Text>
                <Text style={value}>{booking.id.substring(0, 8).toUpperCase()}</Text>
              </Column>
              <Column>
                <Text style={label}>Passengers:</Text>
                <Text style={value}>{booking.seats_booked}</Text>
              </Column>
            </Row>
            
            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>Date & Time:</Text>
                <Text style={value}>{formatDate(booking.trip_details.departure_date)} at {booking.trip_details.departure_time}</Text>
              </Column>
              <Column>
                <Text style={label}>Duration:</Text>
                <Text style={value}>{booking.trip_details.estimated_duration}</Text>
              </Column>
            </Row>

            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>From:</Text>
                <Text style={value}>{booking.trip_details.from_city}</Text>
              </Column>
              <Column>
                <Text style={label}>To:</Text>
                <Text style={value}>{booking.trip_details.to_city}</Text>
              </Column>
            </Row>

            <Text style={label}>Pickup Location:</Text>
            <Text style={value}>{booking.trip_details.pickup_location}</Text>
          </Section>

          <Hr style={divider} />

          {/* Passenger Information */}
          <Section>
            <Heading style={sectionTitle}>Passenger Information</Heading>
            <Row>
              <Column style={{ width: '60px' }}>
                <div style={passengerAvatar}>
                  {booking.passenger_name.charAt(0)}
                </div>
              </Column>
              <Column>
                <Text style={passengerName}>{booking.passenger_name}</Text>
                <Text style={passengerRating}>
                  {renderStars(booking.passenger_rating)} 
                  {booking.passenger_rating ? ` (${booking.passenger_rating}/5)` : ''}
                </Text>
                <Text style={passengerPhone}>Phone: {booking.passenger_phone}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Vehicle Information */}
          <Section>
            <Heading style={sectionTitle}>Your Vehicle</Heading>
            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>Vehicle:</Text>
                <Text style={value}>{booking.vehicle_details.make} {booking.vehicle_details.model}</Text>
              </Column>
              <Column>
                <Text style={label}>Color:</Text>
                <Text style={value}>{booking.vehicle_details.color}</Text>
              </Column>
            </Row>
            <Row style={tripDetailRow}>
              <Column>
                <Text style={label}>License Plate:</Text>
                <Text style={value}>{booking.vehicle_details.license_plate}</Text>
              </Column>
              <Column>
                <Text style={label}>Type:</Text>
                <Text style={value}>{booking.vehicle_details.type}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Earnings Information */}
          <Section style={earningsSection}>
            <Heading style={sectionTitle}>Trip Earnings</Heading>
            <Row style={earningsRow}>
              <Column>
                <Text style={earningsLabel}>Total Fare:</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={earningsValue}>₹{booking.trip_details.fare_breakdown.total}</Text>
              </Column>
            </Row>
            <Row style={earningsRow}>
              <Column>
                <Text style={earningsLabel}>Platform Fee (20%):</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={earningsValue}>-₹{Math.round(booking.trip_details.fare_breakdown.total * 0.2)}</Text>
              </Column>
            </Row>
            <Hr style={minorDivider} />
            <Row style={earningsRow}>
              <Column>
                <Text style={earningsTotalLabel}>Your Estimated Earnings:</Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <Text style={earningsTotalValue}>₹{calculateEarnings(booking.trip_details.fare_breakdown.total)}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Important Instructions */}
          <Section style={instructionsSection}>
            <Heading style={sectionTitle}>Important Instructions</Heading>
            <Text style={instructionText}>
              • Use in-app navigation for optimal route planning
            </Text>
            <Text style={instructionText}>
              • Arrive at pickup location 5 minutes early
            </Text>
            <Text style={instructionText}>
              • Contact passenger if you anticipate delays or have questions
            </Text>
            <Text style={instructionText}>
              • Contact support for any issues during the trip
            </Text>
            <Text style={instructionText}>
              • Remember to rate passenger after completing the trip
            </Text>
          </Section>

          {/* Action Buttons */}
          <Section style={actionSection}>
            <Row>
              <Column style={{ paddingRight: '10px' }}>
                <Button style={primaryButton}>Start Navigation</Button>
              </Column>
              <Column style={{ paddingLeft: '10px' }}>
                <Button style={secondaryButton}>Contact Passenger</Button>
              </Column>
            </Row>
            <Row style={{ marginTop: '16px' }}>
              <Column>
                <Button style={viewButton}>View Trip Details in App</Button>
              </Column>
            </Row>
          </Section>

          {/* Daily Earnings Summary */}
          <Section style={summarySection}>
            <Text style={summaryTitle}>📊 Daily Performance</Text>
            <Text style={summaryText}>
              Check your <Link href="#" style={summaryLink}>daily earnings report</Link> to track your progress
            </Text>
            <Text style={summaryText}>
              Set up <Link href="#" style={summaryLink}>push notifications</Link> to get instant trip alerts
            </Text>
          </Section>

          {/* Support Information */}
          <Section style={supportSection}>
            <Text style={supportTitle}>Driver Support</Text>
            <Text style={supportText}>24/7 Driver Helpline: +91-8888-777-666</Text>
            <Text style={supportText}>For immediate assistance during trips</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Having issues? Contact driver support at drivers@rideshare.com
            </Text>
            <Text style={footerText}>
              Update your app: 
              <Link href="#" style={footerLink}> iOS </Link> | 
              <Link href="#" style={footerLink}> Android</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  textAlign: 'center' as const,
  padding: '32px 20px',
  backgroundColor: '#059669',
  borderRadius: '8px 8px 0 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const confirmationText = {
  color: '#ffffff',
  fontSize: '18px',
  margin: '0',
};

const referenceSection = {
  textAlign: 'center' as const,
  padding: '24px 20px',
  backgroundColor: '#f0fdf4',
};

const referenceLabel = {
  color: '#166534',
  fontSize: '14px',
  margin: '0 0 8px',
};

const referenceNumber = {
  color: '#14532d',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  fontFamily: 'monospace',
};

const sectionTitle = {
  color: '#1e293b',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  padding: '0 20px',
};

const tripDetailRow = {
  margin: '8px 0',
  padding: '0 20px',
};

const label = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 4px',
  fontWeight: '500',
};

const value = {
  color: '#1e293b',
  fontSize: '16px',
  margin: '0 0 16px',
  fontWeight: '600',
};

const passengerAvatar = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#059669',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 20px 0 20px',
};

const passengerName = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const passengerRating = {
  color: '#f59e0b',
  fontSize: '14px',
  margin: '0 0 4px',
};

const passengerPhone = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0',
};

const earningsSection = {
  backgroundColor: '#f0fdf4',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 20px',
};

const earningsRow = {
  margin: '8px 0',
};

const earningsLabel = {
  color: '#166534',
  fontSize: '14px',
  margin: '0',
};

const earningsValue = {
  color: '#14532d',
  fontSize: '14px',
  margin: '0',
};

const earningsTotalLabel = {
  color: '#14532d',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const earningsTotalValue = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const instructionsSection = {
  backgroundColor: '#fef3c7',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 20px',
};

const instructionText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0 0 8px',
};

const actionSection = {
  padding: '24px 20px',
};

const primaryButton = {
  backgroundColor: '#059669',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
  border: 'none',
};

const secondaryButton = {
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  color: '#475569',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
  border: '1px solid #e2e8f0',
};

const viewButton = {
  backgroundColor: '#3730a3',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
  border: 'none',
};

const summarySection = {
  backgroundColor: '#f8fafc',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 20px',
  textAlign: 'center' as const,
};

const summaryTitle = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const summaryText = {
  color: '#64748b',
  fontSize: '14px',
  margin: '0 0 8px',
};

const summaryLink = {
  color: '#3730a3',
  textDecoration: 'underline',
};

const supportSection = {
  backgroundColor: '#fef2f2',
  padding: '20px',
  borderRadius: '8px',
  margin: '0 20px',
  textAlign: 'center' as const,
};

const supportTitle = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const supportText = {
  color: '#991b1b',
  fontSize: '14px',
  margin: '0 0 4px',
};

const footer = {
  textAlign: 'center' as const,
  padding: '24px 20px',
  borderTop: '1px solid #e2e8f0',
  margin: '24px 20px 0',
};

const footerText = {
  color: '#64748b',
  fontSize: '12px',
  margin: '0 0 8px',
};

const footerLink = {
  color: '#059669',
  textDecoration: 'underline',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '24px 20px',
};

const minorDivider = {
  borderColor: '#f1f5f9',
  margin: '8px 0',
};

export default DriverConfirmationEmail;