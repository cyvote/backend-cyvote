import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MailService } from './src/mail/mail.service';
import { MockTokenGenerator } from './src/utils/token-generator/mock-token-generator';
import { DataSource } from 'typeorm';

/**
 * Test script to verify bulk email sending with Mailtrap
 * Tests sending voting token emails to real addresses
 *
 * Uses MockTokenGenerator to generate test tokens
 * Also saves token hash to database for verification testing
 */
async function testEmailSending() {
  console.log('🚀 Starting email sending test...\n');

  // Bootstrap NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);
  const mailService = app.get(MailService);
  const dataSource = app.get(DataSource);

  // Generate mock token for testing
  const { token: testToken, tokenHash } = MockTokenGenerator.generateWithHash();

  console.log('🔐 Mock Token Generated:');
  console.log(`   Plain Token: ${testToken}`);
  console.log(`   Token Hash:  ${tokenHash}`);
  console.log('');

  // Test data for voting token emails
  const testRecipients = [
    {
      email: 'nugrahaadhitama22@gmail.com',
      nama: 'Nugraha Adhitama',
      nim: '2210512109',
    },
    {
      email: '2210512109@mahasiswa.upnvj.ac.id',
      nama: 'Nugraha Adhitama',
      nim: '2210512109',
    },
    {
      email: 'hbintang225@gmail.com',
      nama: 'Haikal Bintang',
      nim: '2210512125',
    },
  ];

  const endDate = '31 Desember 2024';
  const endTime = '23:59 WIB';

  console.log('📧 Test Parameters:');
  console.log(`   - Recipients: ${testRecipients.length}`);
  console.log(`   - Token: ${testToken}`);
  console.log(`   - End Date: ${endDate} ${endTime}`);
  console.log('');

  // Get unique NIMs and save tokens to database for each voter
  const uniqueNims = [...new Set(testRecipients.map((r) => r.nim))];
  console.log('💾 Saving tokens to database for verification testing...');

  for (const nim of uniqueNims) {
    try {
      // Find voter by NIM
      const voters = await dataSource.query(
        `SELECT id FROM voters WHERE nim = $1`,
        [nim],
      );

      if (voters.length > 0) {
        const voterId = voters[0].id;

        // Delete any existing unused tokens for this voter
        await dataSource.query(
          `DELETE FROM tokens WHERE voter_id = $1 AND is_used = false`,
          [voterId],
        );

        // Insert new token
        await dataSource.query(
          `INSERT INTO tokens (voter_id, token_hash, is_used, resend_count)
           VALUES ($1, $2, false, 0)`,
          [voterId, tokenHash],
        );

        console.log(`   ✅ Token saved for NIM: ${nim} (voterId: ${voterId})`);
      } else {
        console.log(`   ⚠️  Voter not found for NIM: ${nim}`);
      }
    } catch (error) {
      console.log(`   ❌ Error saving token for NIM ${nim}: ${error.message}`);
    }
  }
  console.log('');

  // Send emails to all recipients
  const results: Array<{
    email: string;
    success: boolean;
    messageId?: string;
    attempts: number;
    error?: string;
  }> = [];
  for (const recipient of testRecipients) {
    console.log(`📤 Sending to: ${recipient.email}`);
    console.log(`   Name: ${recipient.nama}`);
    console.log(`   NIM: ${recipient.nim}`);

    try {
      const result = await mailService.sendVotingToken({
        to: recipient.email,
        data: {
          nama: recipient.nama,
          nim: recipient.nim,
          token: testToken,
          end_date: endDate,
          end_time: endTime,
        },
      });

      results.push({
        email: recipient.email,
        success: result.success,
        messageId: result.messageId,
        attempts: result.attempts,
        error: result.error?.message,
      });

      if (result.success) {
        console.log(`   ✅ Success! Message ID: ${result.messageId}`);
        console.log(`   📊 Attempts: ${result.attempts}`);
      } else {
        console.log(`   ❌ Failed after ${result.attempts} attempts`);
        console.log(`   ⚠️  Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Exception occurred: ${error.message}`);
      results.push({
        email: recipient.email,
        success: false,
        attempts: 0,
        error: error.message,
      });
    }

    // Small delay to ensure audit log is written to database
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('');
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log('─'.repeat(60));
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.length - successCount;

  console.log(`✅ Successful: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${failCount}/${results.length}`);
  console.log('');

  if (successCount === results.length) {
    console.log('🎉 All emails sent successfully!');
    console.log(
      '📬 Check Mailtrap inbox: https://mailtrap.io/inboxes/3137068/messages',
    );
  } else {
    console.log('⚠️  Some emails failed to send. Check the logs above.');
  }

  console.log('');
  console.log('📝 Token Verification Test:');
  console.log(`   Use token: ${testToken}`);
  console.log(
    `   Token hash saved to database for NIMs: ${uniqueNims.join(', ')}`,
  );
  console.log('');
  console.log('📝 Audit logs should be created in the database.');
  console.log(
    "   Check with: SELECT * FROM audit_log WHERE action LIKE 'EMAIL_%' ORDER BY created_at DESC LIMIT 10;",
  );

  // Wait a bit to ensure all async operations complete
  console.log('\n⏳ Waiting for all database operations to complete...');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify tokens in database
  try {
    const tokens = await dataSource.query(
      `SELECT t.id, t.token_hash, t.is_used, v.nim 
       FROM tokens t 
       JOIN voters v ON t.voter_id = v.id 
       WHERE t.token_hash = $1`,
      [tokenHash],
    );

    console.log('\n� Tokens saved in database:');
    console.log('─'.repeat(60));
    if (tokens.length > 0) {
      tokens.forEach((t: any, index: number) => {
        console.log(
          `${index + 1}. NIM: ${t.nim} | Used: ${t.is_used} | Hash: ${t.token_hash.substring(0, 16)}...`,
        );
      });
    } else {
      console.log('⚠️  No tokens found in database!');
    }
  } catch (error) {
    console.log(`\n⚠️  Could not verify tokens: ${error.message}`);
  }

  // Close application
  await app.close();
  console.log('\n✅ Test completed.');
}

// Run the test
testEmailSending()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error during test:', error);
    process.exit(1);
  });
