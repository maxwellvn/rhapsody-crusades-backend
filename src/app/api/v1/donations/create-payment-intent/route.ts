import { NextRequest } from 'next/server';
import { validate } from '@/lib/validator';
import * as Response from '@/lib/response';
import { getStripe, STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validator = validate(body)
      .required('amount', 'Amount is required')
      .numeric('amount', 'Amount must be a number')
      .min('amount', 1, 'Minimum donation is $1')
      .max('amount', 10000, 'Maximum donation is $10,000')
      .required('donor_name', 'Donor name is required')
      .required('donor_email', 'Donor email is required')
      .email('donor_email', 'Invalid email format');

    if (validator.fails()) {
      return Response.validationError(validator.errors());
    }

    const stripe = getStripe();

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(body.amount) * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        donor_name: body.donor_name,
        donor_email: body.donor_email,
        purpose: 'donation',
        source: 'mobile_app',
      },
      receipt_email: body.donor_email,
    });

    return Response.success(
      {
        client_secret: paymentIntent.client_secret,
        publishable_key: STRIPE_PUBLISHABLE_KEY,
        payment_intent_id: paymentIntent.id,
      },
      'Payment intent created successfully'
    );
  } catch (error) {
    console.error('Create payment intent error:', error);
    return Response.serverError('Failed to create payment intent');
  }
}
