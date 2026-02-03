import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MailService } from './src/mail/mail.service';

/**
 * Test script to verify bulk email sending with Mailtrap
 * Tests sending voting token emails to 2 real addresses
 */
async function testEmailSending() {
  console.log('🚀 Starting email sending test...\n');

  // Bootstrap NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);
  const mailService = app.get(MailService);

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
  ];

  const testToken = 'ABC123XYZ789TEST';
  const endDate = '31 Desember 2024';
  const endTime = '23:59 WIB';

  console.log('📧 Test Parameters:');
  console.log(`   - Recipients: ${testRecipients.length}`);
  console.log(`   - Token: ${testToken}`);
  console.log(`   - End Date: ${endDate} ${endTime}`);
  console.log('');

  // Send emails to both recipients
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
