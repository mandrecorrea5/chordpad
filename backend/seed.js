import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleSong = {
  title: 'Yellow (Coldplay)',
  content: `<intro bpm="120" bars="4">
[G] [D] [Em] [C]
</intro>

<verse bpm="120" bars="8">
[G] Look at the stars
[D] Look how they shine for you
[Em] And everything you do
[C] Yeah, they were all yellow
</verse>

<chorus bpm="140" bars="8">
[C] I came along
[G] I wrote a song for you
[D] And all the things you do
[Em] And it was called Yellow
</chorus>

<verse bpm="120" bars="8">
[G] So then I took my turn
[D] Oh, what a thing to have done
[Em] And it was all yellow
[C] Your skin, oh yeah, your skin and bones
</verse>

<chorus bpm="140" bars="8">
[C] I came along
[G] I wrote a song for you
[D] And all the things you do
[Em] And it was called Yellow
</chorus>`
};

async function main() {
  console.log('Seeding database...');
  
  const song = await prisma.song.create({
    data: sampleSong
  });
  
  console.log('Created sample song:', song.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

