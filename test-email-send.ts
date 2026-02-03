import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MailService } from './src/mail/mail.service';
import { MockTokenGenerator } from './src/utils/token-generator/mock-token-generator';

/**
 * Test script to verify bulk email sending with Mailtrap
 * Tests sending voting token emails to real addresses
 *
 * Uses MockTokenGenerator to generate test tokens
 */
async function testEmailSending() {
  console.log('🚀 Starting email sending test...\n');

  // Bootstrap NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);
  const mailService = app.get(MailService);

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
  console.log('📝 Audit logs should be created in the database.');
  console.log(
    "   Check with: SELECT * FROM audit_logs WHERE action LIKE 'EMAIL_%' ORDER BY created_at DESC LIMIT 10;",
  );

  // Wait a bit to ensure all async operations complete
  console.log('\n⏳ Waiting for all database operations to complete...');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Verify audit logs in database
  try {
    const { DataSource } = await import('typeorm');
    const dataSource = app.get(DataSource);

    const auditLogs = await dataSource.query(
      `SELECT id, action, resource_type, status, details->>'to' as recipient, 
              details->>'messageId' as message_id, created_at
       FROM audit_logs 
       WHERE action LIKE 'EMAIL_%' 
       ORDER BY created_at DESC 
       LIMIT ${testRecipients.length}`,
    );

    console.log('\n📋 Recent audit logs from database:');
    console.log('─'.repeat(80));
    if (auditLogs.length > 0) {
      auditLogs.forEach((log: any, index: number) => {
        console.log(
          `${index + 1}. ${log.action} - ${log.recipient} (${log.status})`,
        );
        console.log(`   Message ID: ${log.message_id || 'N/A'}`);
        console.log(`   Created: ${log.created_at}`);
      });

      if (auditLogs.length < testRecipients.length) {
        console.log(
          `\n⚠️  Warning: Expected ${testRecipients.length} audit logs but found ${auditLogs.length}`,
        );
      }
    } else {
      console.log('⚠️  No recent audit logs found!');
    }
  } catch (error) {
    console.log(`\n⚠️  Could not verify audit logs: ${error.message}`);
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
