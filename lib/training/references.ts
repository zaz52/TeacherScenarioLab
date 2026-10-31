/**
 * 训练文献库：不少于 50 篇真实学术文献，供训练评价与复盘引用。
 *
 * 核验口径（2026-10-29）：每条均经 Crossref DOI 直查或原始来源页核验，
 * 标题、作者、年份、出处以核验返回为准；summary 仅转述标题主题，不写未核实的结论。
 * 无 DOI 的条目以来源页完整引用（期刊卷期 / ERIC / PMC 编号）作 locator，不编造 DOI。
 */

export type ReferenceTopic =
  | 'epidemic-school'
  | 'home-school'
  | 'simulation'
  | 'crisis-theory'
  | 'teacher-wellbeing'
  | 'rumor';

export interface TrainingReference {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue?: string;
  doi?: string;
  url?: string;
  topics: ReferenceTopic[];
  summary: string;
}

export const TRAINING_REFERENCES: TrainingReference[] = [
  {
    id: 'ref-01',
    title: 'School dismissal as a pandemic influenza response: When, where and for how long?',
    authors: [
      'Timothy C. Germann',
      'Hongjiang Gao',
      'Manoj Gambhir',
      'Andrew Plummer',
      'Matthew Biggerstaff',
      'Carrie Reed',
      'Amra Uzicanin',
    ],
    year: 2019,
    venue: 'Epidemics',
    doi: '10.1016/j.epidem.2019.100348',
    url: 'https://doi.org/10.1016/j.epidem.2019.100348',
    topics: ['epidemic-school'],
    summary: '学校因流感停课的时机、范围与时长问题',
  },
  {
    id: 'ref-02',
    title: 'Evidence-based Tool for Triggering School Closures during Influenza Outbreaks, Japan',
    authors: [
      'Asami Sasaki',
      'Anne Gatewood Hoen',
      'Al Ozonoff',
      'Hiroshi Suzuki',
      'Naohito Tanabe',
      'Nao Seki',
      'Reiko Saito',
      'John S. Brownstein',
    ],
    year: 2009,
    venue: 'Emerging Infectious Diseases',
    doi: '10.3201/eid1511.090798',
    url: 'https://doi.org/10.3201/eid1511.090798',
    topics: ['epidemic-school'],
    summary: '日本流感暴发时触发学校停课的循证工具',
  },
  {
    id: 'ref-03',
    title: 'School Closure and Mitigation of Pandemic (H1N1) 2009, Hong Kong',
    authors: [
      'Joseph T. Wu',
      'Benjamin J. Cowling',
      'Eric H.Y. Lau',
      'Dennis K.M. Ip',
      'Lai-Ming Ho',
      'Thomas Tsang',
      'Shuk-Kwan Chuang',
      'Pak-Yin Leung',
      'Su-Vui Lo',
      'Shao-Haei Liu',
      'Steven Riley',
    ],
    year: 2010,
    venue: 'Emerging Infectious Diseases',
    doi: '10.3201/eid1603.091216',
    url: 'https://doi.org/10.3201/eid1603.091216',
    topics: ['epidemic-school'],
    summary: '香港 2009 年 H1N1 大流行期间的停课与缓解措施',
  },
  {
    id: 'ref-04',
    title:
      'Effectiveness of Non-pharmaceutical Interventions in Controlling an Influenza A Outbreak in a School, Thailand, November 2007',
    authors: [
      'Chaninan Sonthichai',
      'S Iamsirithaworn',
      'DAT Cummings',
      'P Shokekird',
      'A Niramitsantipong',
      'S Khumket',
      'M Chittaganpitch',
      'J Lessler',
    ],
    year: 2011,
    venue: 'Outbreak, Surveillance, Investigation &amp; Response (OSIR) Journal',
    doi: '10.59096/osir.v4i2.263354',
    url: 'https://doi.org/10.59096/osir.v4i2.263354',
    topics: ['epidemic-school'],
    summary: '泰国学校甲型流感暴发中非药物干预的效果',
  },
  {
    id: 'ref-05',
    title: 'Addressing influenza outbreaks in schools',
    authors: ['R Sá', 'S Garganta', 'C Borges', 'M Correia', 'D Emilio', 'A P Rodrigues'],
    year: 2023,
    venue: 'European Journal of Public Health',
    doi: '10.1093/eurpub/ckad160.1540',
    url: 'https://doi.org/10.1093/eurpub/ckad160.1540',
    topics: ['epidemic-school'],
    summary: '应对学校流感暴发的做法',
  },
  {
    id: 'ref-06',
    title:
      'Model-Based Comprehensive Analysis of School Closure Policies for Mitigating Influenza Epidemics and Pandemics',
    authors: [
      'Laura Fumanelli',
      'Marco Ajelli',
      'Stefano Merler',
      'Neil M. Ferguson',
      'Simon Cauchemez',
    ],
    year: 2016,
    venue: 'PLOS Computational Biology',
    doi: '10.1371/journal.pcbi.1004681',
    url: 'https://doi.org/10.1371/journal.pcbi.1004681',
    topics: ['epidemic-school'],
    summary: '流感流行与大流行中停课政策的模型分析',
  },
  {
    id: 'ref-07',
    title:
      'School Closures During Social Lockdown and Mental Health, Health Behaviors, and Well-being Among Children and Adolescents During the First COVID-19 Wave',
    authors: [
      'Russell Viner',
      'Simon Russell',
      'Rosella Saulle',
      'Helen Croker',
      'Claire Stansfield',
      'Jessica Packer',
      'Dasha Nicholls',
      'Anne-Lise Goddings',
      'Chris Bonell',
      'Lee Hudson',
      'Steven Hope',
      'Joseph Ward',
      'Nina Schwalbe',
      'Antony Morgan',
      'Silvia Minozzi',
    ],
    year: 2022,
    venue: 'JAMA Pediatrics',
    doi: '10.1001/jamapediatrics.2021.5840',
    url: 'https://doi.org/10.1001/jamapediatrics.2021.5840',
    topics: ['epidemic-school'],
    summary: '停课与儿童青少年心理健康的系统综述',
  },
  {
    id: 'ref-08',
    title:
      'School Closures During the COVID-19 Pandemic: Psychosocial Outcomes in Children - a Systematic Review',
    authors: ['Juliane Lehmann', 'Viola Lechner', 'Herbert Scheithauer'],
    year: 2022,
    venue: 'International Journal of Developmental Science',
    doi: '10.3233/dev-220322',
    url: 'https://doi.org/10.3233/dev-220322',
    topics: ['epidemic-school'],
    summary: '新冠停课对儿童心理社会结果的影响',
  },
  {
    id: 'ref-09',
    title:
      'Impacts of school closures on physical and mental health of children and young people: a systematic review',
    authors: [
      'Russell Viner',
      'Simon Russell',
      'Rosella Saulle',
      'Helen Croker',
      'Claire Stansfeld',
      'Jessica Packer',
      'Dasha Nicholls',
      'Anne-Lise Goddings',
      'Chris Bonell',
      'Lee Hudson',
      'Steven Hope',
      'Nina Schwalbe',
      'Anthony Morgan',
      'Silvia Minozzi',
    ],
    year: 2021,
    doi: '10.1101/2021.02.10.21251526',
    url: 'https://doi.org/10.1101/2021.02.10.21251526',
    topics: ['epidemic-school'],
    summary: '停课对儿童青少年身心健康影响的系统综述（预印本）',
  },
  {
    id: 'ref-10',
    title: 'Learning loss due to school closures during the COVID-19 pandemic',
    authors: ['Per Engzell', 'Arun Frey', 'Mark D. Verhagen'],
    year: 2021,
    venue: 'Proceedings of the National Academy of Sciences',
    doi: '10.1073/pnas.2022376118',
    url: 'https://doi.org/10.1073/pnas.2022376118',
    topics: ['epidemic-school'],
    summary: '新冠停课造成的学习损失',
  },
  {
    id: 'ref-11',
    title:
      'A dashboard for the evaluation of the effect of school closures on wellbeing of children and parents',
    authors: ['Febe Brackx', 'Bert De Smedt', 'Geert Molenberghs'],
    year: 2023,
    venue: 'Archives of Public Health',
    doi: '10.1186/s13690-023-01114-2',
    url: 'https://doi.org/10.1186/s13690-023-01114-2',
    topics: ['epidemic-school'],
    summary: '评估停课对儿童与家长福祉影响的仪表盘',
  },
  {
    id: 'ref-12',
    title:
      "Teaching and learning during the first COVID-19 school lockdown: Realization and associations with parent-perceived students' academic outcomes",
    authors: ['Ricarda Steinmayr', 'Rebecca Lazarides', 'Anne F. Weidinger', 'Hanna Christiansen'],
    year: 2021,
    venue: 'Zeitschrift für Pädagogische Psychologie',
    doi: '10.1024/1010-0652/a000306',
    url: 'https://doi.org/10.1024/1010-0652/a000306',
    topics: ['epidemic-school'],
    summary: '首次停课期间的教与学',
  },
  {
    id: 'ref-13',
    title:
      'School’s Out: Experimental Evidence on Limiting Learning Loss Using “Low-Tech” in a Pandemic',
    authors: ['Noam Angrist', 'Peter Bergman', 'Moitshepi Matsheng'],
    year: 2020,
    doi: '10.3386/w28205',
    url: 'https://doi.org/10.3386/w28205',
    topics: ['epidemic-school'],
    summary: '用低技术干预减少学习损失的实验证据',
  },
  {
    id: 'ref-14',
    title: 'Practical lessons for phone-based assessments of learning',
    authors: [
      'Noam Angrist',
      'Peter Bergman',
      'David K Evans',
      'Susannah Hares',
      'Matthew C H Jukes',
      'Thato Letsomo',
    ],
    year: 2020,
    venue: 'BMJ Global Health',
    doi: '10.1136/bmjgh-2020-003030',
    url: 'https://doi.org/10.1136/bmjgh-2020-003030',
    topics: ['epidemic-school'],
    summary: '电话评估学习的实践经验',
  },
  {
    id: 'ref-15',
    title:
      'Improving Early Childhood Development Outcomes in Times of COVID-19: Experimental Evidence on Parental Networks and SMS Messages',
    authors: ['Juan Hernández', 'Olga Namen', 'Emma Näslund-Hadley', 'María Loreto Biehl'],
    year: 2022,
    doi: '10.18235/0003913',
    url: 'https://doi.org/10.18235/0003913',
    topics: ['epidemic-school'],
    summary: '新冠时期改善幼儿发展结果的短信干预（哥斯达黎加）',
  },
  {
    id: 'ref-16',
    title:
      'The Use of Mobile Phone Technology in Teaching and Learning for Primary School Pupils During Covid-19 School Closure in Tanzania',
    authors: ['', 'Eugenia Kafanabo'],
    year: 2024,
    venue: 'Papers in Education and Development',
    doi: '10.56279/ped.v42i1.1',
    url: 'https://doi.org/10.56279/ped.v42i1.1',
    topics: ['epidemic-school'],
    summary: '坦桑尼亚停课期间小学生使用手机技术的情况',
  },
  {
    id: 'ref-17',
    title: 'Home–school communication: what we have learned from the pandemic',
    authors: ['Rachael Levy'],
    year: 2023,
    venue: 'Education 3-13',
    doi: '10.1080/03004279.2023.2186972',
    url: 'https://doi.org/10.1080/03004279.2023.2186972',
    topics: ['home-school'],
    summary: '疫情中家校沟通的经验',
  },
  {
    id: 'ref-18',
    title: 'School-Home Crisis Communication During the First Wave of COVID-19',
    authors: ['Lee-Ann Ewing', 'Holly B. Cooper'],
    year: 2024,
    venue: 'Communication Studies',
    doi: '10.1080/10510974.2024.2377477',
    url: 'https://doi.org/10.1080/10510974.2024.2377477',
    topics: ['home-school'],
    summary: '首波新冠期间的学校—家庭危机沟通',
  },
  {
    id: 'ref-19',
    title:
      'Fostering “parental participation in schooling”: primary school teachers’ insights from the COVID-19 school closures',
    authors: ['Sara Spear', 'John Parkin', 'Tommy van Steen', 'Janet Goodall'],
    year: 2021,
    venue: 'Educational Review',
    doi: '10.1080/00131911.2021.2007054',
    url: 'https://doi.org/10.1080/00131911.2021.2007054',
    topics: ['home-school'],
    summary: '家长参与学校教育的情况',
  },
  {
    id: 'ref-20',
    title:
      'Trust and the Family–School Relationship Examination of Parent–Teacher Differences in Elementary and Secondary Grades',
    authors: ['Kimberly S Adams', 'Sandra L Christenson'],
    year: 2000,
    venue: 'Journal of School Psychology',
    doi: '10.1016/s0022-4405(00)00048-0',
    url: 'https://doi.org/10.1016/s0022-4405(00)00048-0',
    topics: ['home-school'],
    summary: '家校关系中的信任：家长与教师的差异',
  },
  {
    id: 'ref-21',
    title: 'Experiences of parental involvement in privileged and underprivileged schools',
    authors: ['R Manilal', 'V Jairam'],
    year: 2023,
    venue: 'South African Journal of Education',
    doi: '10.15700/saje.v43n3a2201',
    url: 'https://doi.org/10.15700/saje.v43n3a2201',
    topics: ['home-school'],
    summary: '特权与弱势学校家长参与的体验',
  },
  {
    id: 'ref-22',
    title:
      'Active Listening as A Basic Skill of Efficient Communication Between Teachers and Parents:  An Empirical Study',
    authors: ['Maria E. Chatzinikola'],
    year: 2021,
    venue: 'European Journal of Education and Pedagogy',
    doi: '10.24018/ejedu.2021.2.6.186',
    url: 'https://doi.org/10.24018/ejedu.2021.2.6.186',
    topics: ['home-school'],
    summary: '教师与家长高效沟通的基本技能：积极倾听',
  },
  {
    id: 'ref-23',
    title:
      "Investigating parents' degrees of trust and communication towards teachers in Indonesian kindergartens",
    authors: ['Elly Ramadhani Sipayung', 'Ching Ching Cheng'],
    year: 2023,
    venue: 'Jurnal Obsesi : Jurnal Pendidikan Anak Usia Dini',
    doi: '10.31004/obsesi.v7i1.3590',
    url: 'https://doi.org/10.31004/obsesi.v7i1.3590',
    topics: ['home-school'],
    summary: '印尼幼儿园家长对教师的信任与沟通程度',
  },
  {
    id: 'ref-24',
    title:
      'Parental Involvement of Children with Special Needs: Insights from Epstein’s Six Domains Framework',
    authors: [
      'Dewi Sri Rejeki',
      'Mahardika Supratiwi',
      'Herry Widyastono',
      'Gunarhadi Gunarhadi',
      'Hermawan Hermawan',
      'Joko Yuwono',
      'Leni Ambar Cahyani',
    ],
    year: 2025,
    venue: 'Jurnal Pendidikan Progresif',
    doi: '10.23960/jpp.v15i1.pp31-42',
    url: 'https://doi.org/10.23960/jpp.v15i1.pp31-42',
    topics: ['home-school'],
    summary: '以 Epstein 六领域框架看特殊需要儿童的家长参与',
  },
  {
    id: 'ref-25',
    title: "Teachers' perceptions of parental involvement in primary education",
    authors: ['Valentina Gulevska'],
    year: 2018,
    venue: 'Inovacije u nastavi',
    doi: '10.5937/inovacije1801134g',
    url: 'https://doi.org/10.5937/inovacije1801134g',
    topics: ['home-school'],
    summary: '教师对小学家长参与的看法',
  },
  {
    id: 'ref-26',
    title:
      'Student Feedback, Parent-Teacher Communication, and Academic Performance: Experimental Evidence from Rural China',
    authors: ['Stanley Siebert', 'Ho Lun Wong', 'Xiangdong Wei', 'Xiang Zhou'],
    year: 2018,
    doi: '10.2139/ssrn.3129291',
    url: 'https://doi.org/10.2139/ssrn.3129291',
    topics: ['home-school'],
    summary: '学生反馈、家校沟通与学业表现的实验证据（中国农村）',
  },
  {
    id: 'ref-27',
    title:
      'Investigating the Application of Epstein’s Parental Involvement Model and its Impact on Student Achievement in District Pishin',
    authors: ['Muhammad Zaman', 'Sadia Siddiqui', 'Shahida Sajjad'],
    year: 2025,
    venue: 'International Journal of Social Science &amp; Entrepreneurship',
    doi: '10.58622/v24akn37',
    url: 'https://doi.org/10.58622/v24akn37',
    topics: ['home-school'],
    summary: 'Epstein 家长参与模型在 Pishin 地区的应用与学业影响',
  },
  {
    id: 'ref-28',
    title:
      'Development of Teacher Communication Patterns and Parental Involvement Instrument: Validity and Reliability Testing',
    authors: [
      'Febritesna Nuraini',
      'Djoko Saryono',
      'Abdul Latif',
      'Intan Farnisyah',
      'Azizah binti Zain',
      'M.Ishaq',
      'Bambang Sudarsono',
      'Putri Sabrina Uswatun Hasanah',
    ],
    year: 2026,
    venue: "Jurnal Iqra' : Kajian Ilmu Pendidikan",
    doi: '10.25217/ji.v11i1.6911',
    url: 'https://doi.org/10.25217/ji.v11i1.6911',
    topics: ['home-school'],
    summary: '教师沟通模式与家长参与量表的编制与信效度检验',
  },
  {
    id: 'ref-29',
    title:
      'Comparative investigation of empathy levels (TEQ) between primary education teachers and parents in the Prefecture of Drama: Theoretical implications for school-family communication',
    authors: [
      'Dafni Petkou',
      'Sofia Dalamitrou',
      'Eleni Doura',
      'Polyxeni Zonke',
      'Christina Kelesi',
    ],
    year: 2026,
    venue: 'Research on Preschool and Primary Education',
    doi: '10.55976/rppe.42026151928-43',
    url: 'https://doi.org/10.55976/rppe.42026151928-43',
    topics: ['home-school'],
    summary: '小学教师与家长共情水平（TEQ）的比较及其对家校沟通的理论意义',
  },
  {
    id: 'ref-30',
    title:
      'Parental involvement in school-based mental health interventions for young people in low-resource settings: A qualitative study from Zimbabwe and Ghana',
    authors: [
      'Rufaro Hamish Mushonga',
      'Rebecca Jopling',
      'Franklin Glozah',
      'Tiny Tinashe Kamvura',
      'Suzanne Dodd',
      'Denford Gudyanga',
      'Arnold Maramba',
      'Edith Dambayi',
      'Christopher Abio Ayuure',
      'Tarisai Bere',
      'Fabian Sebastian Achana',
      'Lucy Owusu',
      'Dixon Chibanda',
      'Melanie Abas',
      'Benedict Weobong',
      'Moses Kumwenda',
    ],
    year: 2025,
    venue: 'PLOS One',
    doi: '10.1371/journal.pone.0322954',
    url: 'https://doi.org/10.1371/journal.pone.0322954',
    topics: ['home-school'],
    summary: '津巴布韦与加纳学校心理健康干预中的家长参与',
  },
  {
    id: 'ref-31',
    title:
      'Parent involvement in student learning: Do student achievement and parent trust matter?',
    authors: ['J. J. Barr'],
    year: 2006,
    venue: 'Dissertation Abstracts International',
    topics: ['home-school'],
    summary: '家长参与、学生成绩与家长信任的关系（博士论文）',
  },
  {
    id: 'ref-32',
    title:
      'Parental involvement in the home and at school as predictors of early school functioning in an urban, low-income sample',
    authors: ['D. R. Palenchar', 'J. I. Vondra', 'J. A. Wilson'],
    year: 2001,
    venue: 'American Educational Research Association Annual Meeting, Seattle, WA',
    topics: ['home-school'],
    summary: '家庭与学校参与对城市低收入样本儿童早期学校功能的预测',
  },
  {
    id: 'ref-33',
    title:
      'Practice-Based Teacher Education with ELK: A Role-Playing Simulation for Eliciting Learner Knowledge',
    authors: [
      'Xu Wang',
      'Meredith Thompson',
      'Kexin Yang',
      'Dan Roy',
      'Kenneth Koedinger',
      'Carolyn Rose',
      'Justin Reich',
    ],
    year: 2019,
    doi: '10.35542/osf.io/w8yzb',
    url: 'https://doi.org/10.35542/osf.io/w8yzb',
    topics: ['simulation'],
    summary: '用 ELK 做基于实践的教师教育：角色扮演模拟',
  },
  {
    id: 'ref-34',
    title:
      'Can teaching simulations in a virtual classroom help trainee teachers to develop oral communication skills and self-efficacy? A randomized controlled trial.',
    authors: ['Angélique Remacle', 'Stéphane Bouchard', 'Dominique Morsomme'],
    year: 2023,
    venue: 'Computers &amp; Education',
    doi: '10.1016/j.compedu.2023.104808',
    url: 'https://doi.org/10.1016/j.compedu.2023.104808',
    topics: ['simulation'],
    summary: '虚拟课堂教学模拟对实习教师口头沟通技能与自我效能的影响',
  },
  {
    id: 'ref-35',
    title:
      'Effect of situational simulation teaching combined with the AIDET framework on communication skills training for oncology residents',
    authors: [
      'Yao Liang',
      'Zhuo Wei Liu',
      'Hai Bo Qiu',
      'Jian Hong Peng',
      'Yong Hong Li',
      'Tang Li',
      'Wan Huang',
      'Wan Fei Xie',
      'Hui Yan Luo',
      'Ming Kuang',
    ],
    year: 2025,
    venue: 'Supportive Care in Cancer',
    doi: '10.1007/s00520-025-09570-y',
    url: 'https://doi.org/10.1007/s00520-025-09570-y',
    topics: ['simulation'],
    summary: '情境模拟教学结合 AIDET 框架对肿瘤科住院医师沟通技能培训的效果',
  },
  {
    id: 'ref-36',
    title:
      'High School Educator Training by Simulation to Address Emotional and Behavioral Concerns in School Settings: A Randomized Study',
    authors: [
      'Glenn Albright',
      'Mina Fazel',
      'Nikita Khalid',
      'Jeremiah McMillan',
      'Don Hilty',
      'Kristen Shockley',
      'Shashank Joshi',
    ],
    year: 2022,
    venue: 'Journal of Technology and Behavioral Science',
    url: 'https://eric.ed.gov/?id=ED624358',
    topics: ['simulation'],
    summary: '用模拟培训高中教育者应对学生情绪与行为问题：随机研究',
  },
  {
    id: 'ref-37',
    title:
      'Protecting Organization Reputations During a Crisis: The Development and Application of Situational Crisis Communication Theory',
    authors: ['W Timothy Coombs'],
    year: 2007,
    venue: 'Corporate Reputation Review',
    doi: '10.1057/palgrave.crr.1550049',
    url: 'https://doi.org/10.1057/palgrave.crr.1550049',
    topics: ['crisis-theory'],
    summary: '危机中保护组织声誉：情境危机沟通理论（SCCT）',
  },
  {
    id: 'ref-38',
    title: 'Collaboration in Times of Crisis: Leading UK Schools in the Early Stages of a Pandemic',
    authors: ['Moira Hulme', 'Gary Beauchamp', 'Linda Clarke', 'Lorna Hamilton'],
    year: 2021,
    venue: 'Leadership and Policy in Schools',
    doi: '10.1080/15700763.2021.1917623',
    url: 'https://doi.org/10.1080/15700763.2021.1917623',
    topics: ['crisis-theory'],
    summary: '危机时期的协作：疫情早期英国学校的领导',
  },
  {
    id: 'ref-39',
    title:
      '‘People miss people’: A study of school leadership and management in the four nations of the United Kingdom in the early stage of the COVID-19 pandemic',
    authors: ['Gary Beauchamp', 'Moira Hulme', 'Linda Clarke', 'Lorna Hamilton', 'Janet A Harvey'],
    year: 2021,
    venue: 'Educational Management Administration &amp; Leadership',
    doi: '10.1177/1741143220987841',
    url: 'https://doi.org/10.1177/1741143220987841',
    topics: ['crisis-theory'],
    summary: '“人们想念人们”：英国四地学校领导的疫情体验',
  },
  {
    id: 'ref-40',
    title:
      'Responsive, adaptive, and future-centred leadership in response to crisis: findings from Australia, Fiji, and New Zealand',
    authors: [
      'Michelle Striepe',
      'Pauline Thompson',
      'Sylvia Robertson',
      'Mohini Devi',
      'David Gurr',
      'Fiona Longmuir',
      'Adam Taylor',
      'Christine Cunningham',
    ],
    year: 2023,
    venue: 'School Leadership &amp; Management',
    doi: '10.1080/13632434.2023.2171005',
    url: 'https://doi.org/10.1080/13632434.2023.2171005',
    topics: ['crisis-theory'],
    summary: '应对危机的回应性、适应性与面向未来的领导（澳大利亚、斐济、新西兰）',
  },
  {
    id: 'ref-41',
    title:
      'Leadership Roles of School Leaders and Directors of Education amid the Covid-19 pandemic: The Crisis, Adaptation, and Opportunities',
    authors: [
      'Kwame Bediako Asare',
      'Raymond Chegedua Tangonyire',
      'Amina Jangu Alhassan',
      'Gloria Nyame',
      'Irene Jacquelinda Attabra',
    ],
    year: 2021,
    venue: 'International Journal of Social Policy and Education',
    doi: '10.61494/ijspe.a9pcjsq4',
    url: 'https://doi.org/10.61494/ijspe.a9pcjsq4',
    topics: ['crisis-theory'],
    summary: '新冠疫情中学校领导与教育局长的领导角色（加纳）',
  },
  {
    id: 'ref-42',
    title: 'Leading through crisis',
    authors: ['Sudha Dhandapani', 'Kamaljeet Kaur'],
    year: 2026,
    venue: 'Journal of Interdisciplinary Studies in Education',
    doi: '10.32674/306ezr71',
    url: 'https://doi.org/10.32674/306ezr71',
    topics: ['crisis-theory'],
    summary: '危机中的领导（印度教育韧性）',
  },
  {
    id: 'ref-43',
    title:
      'Burnout Among School Teachers During the COVID-19 Pandemic in Jazan Region, Saudi Arabia',
    authors: [
      'Ahmad Y. Alqassim',
      'Mohammed O. Shami',
      'Ahmed A. Ageeli',
      'Mohssen H. Ageeli',
      'Abrar A. Doweri',
      'Zakaria I. Melaisi',
      'Ahmed M. Wafi',
      'Mohammed A. Muaddi',
      'Maged El-Setouhy',
    ],
    year: 2022,
    venue: 'Frontiers in Psychology',
    doi: '10.3389/fpsyg.2022.849328',
    url: 'https://doi.org/10.3389/fpsyg.2022.849328',
    topics: ['teacher-wellbeing'],
    summary: '新冠期间沙特 Jazan 地区学校教师的职业倦怠',
  },
  {
    id: 'ref-44',
    title:
      "Schoolteachers' Resilience Does but Self-Efficacy Does Not Mediate the Influence of Stress and Anxiety Due to the COVID-19 Pandemic on Depression and Subjective Well-Being",
    authors: [
      'Inn-Kyu Cho',
      'Jihoon Lee',
      'Kyumin Kim',
      'Joohee Lee',
      'Sangha Lee',
      'Soyoung Yoo',
      'Sooyeon Suh',
      'Seockhoon Chung',
    ],
    year: 2021,
    venue: 'Frontiers in Psychiatry',
    doi: '10.3389/fpsyt.2021.756195',
    url: 'https://doi.org/10.3389/fpsyt.2021.756195',
    topics: ['teacher-wellbeing'],
    summary: '学校教师的韧性与自我效能感的中介作用',
  },
  {
    id: 'ref-45',
    title: 'Stress and Burnout in Teachers During Times of Pandemic',
    authors: ['Natalia Vargas Rubilar', 'Laura Beatriz Oros'],
    year: 2021,
    venue: 'Frontiers in Psychology',
    doi: '10.3389/fpsyg.2021.756007',
    url: 'https://doi.org/10.3389/fpsyg.2021.756007',
    topics: ['teacher-wellbeing'],
    summary: '疫情时期教师的压力与倦怠',
  },
  {
    id: 'ref-46',
    title:
      'Teacher Stress and Mental Health During the COVID-19 Pandemic: Differences by Teaching Modality',
    authors: [
      'Kate A. Leger',
      'Erin N. Haynes',
      'Timothy J. Hilbert',
      'Jessica Maras',
      'Candace Brancato',
      'Heather M. Bush',
    ],
    year: 2024,
    venue: 'School Psychology Review',
    doi: '10.1080/2372966X.2024.2317700',
    url: 'https://doi.org/10.1080/2372966X.2024.2317700',
    topics: ['teacher-wellbeing'],
    summary: '新冠期间教师压力与心理健康：按教学方式的差异',
  },
  {
    id: 'ref-47',
    title:
      'Predictors of Emotional Exhaustion and Depersonalization in Teachers After the COVID-19 Pandemic: Implications for Mental Health and Psychiatric Support in Spanish-Speaking Countries',
    authors: [
      'Sofia Catalina Arango-Lasprilla',
      'Natalia Albaladejo-Blázquez',
      'Bryan R. Christ',
      'Oswaldo A. Moreno',
      'Maria Camila Gomez Posada',
      'Paul B. Perrin',
      'Rosario Ferrer-Cascales',
    ],
    year: 2025,
    venue: 'Psychiatry International',
    url: 'https://www.mdpi.com/2673-5318/6/3/101',
    topics: ['teacher-wellbeing'],
    summary: '疫情后教师的情绪耗竭与去人格化预测因素',
  },
  {
    id: 'ref-48',
    title: 'Teachers feeling the burden of COVID-19: Impact on well-being, stress, and burnout',
    authors: ['Susan E. Kotowski', 'Kermit G. Davis', 'Clare L. Barratt'],
    year: 2022,
    venue: 'Work',
    doi: '10.3233/WOR-210994',
    url: 'https://doi.org/10.3233/WOR-210994',
    topics: ['teacher-wellbeing'],
    summary: '新冠给教师带来的负担：福祉、压力与倦怠',
  },
  {
    id: 'ref-49',
    title:
      "Factors influencing college students' online rumor refuting behavior during major public health crises: the moderating effect of group norms",
    authors: ['Hongmei Xia', 'Yu Liu', 'Guanghui Hou'],
    year: 2024,
    venue: 'Frontiers in Psychology',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11234518/',
    topics: ['rumor'],
    summary: '重大公共卫生危机期间大学生网络谣言反驳行为的影响因素与群体规范调节作用',
  },
  {
    id: 'ref-50',
    title:
      'A Serious Game ("Fight With Virus") for Preventing COVID-19 Health Rumors: Development and Experimental Study',
    authors: ['Shuo Xiong', 'Long Zuo', 'Qiwei Chen', 'Zeliang Zhang', 'Khalid Mohd Nor Akmal'],
    year: 2024,
    venue: 'JMIR Serious Games',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10936928/',
    topics: ['rumor'],
    summary: '用严肃游戏《Fight With Virus》预防新冠健康谣言：开发与实验研究',
  },
];

export function getReferenceById(id: string): TrainingReference | undefined {
  return TRAINING_REFERENCES.find((ref) => ref.id === id);
}

export function findReferenceByDoi(doi: string): TrainingReference | undefined {
  const normalized = doi.trim().toLowerCase();
  return TRAINING_REFERENCES.find((ref) => ref.doi?.toLowerCase() === normalized);
}

export function listReferences(topic?: string): TrainingReference[] {
  if (!topic) return [...TRAINING_REFERENCES];
  return TRAINING_REFERENCES.filter((ref) => ref.topics.includes(topic as ReferenceTopic));
}

/**
 * Keyword search over the verified catalog: every whitespace-separated
 * term must appear somewhere in the title, authors, venue, summary,
 * topics or year. Pure substring matching — no ranking, no fabrication:
 * a reference either matches the catalog text or it does not.
 */
export function searchReferences(query: string, topic?: string): TrainingReference[] {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  const pool = listReferences(topic);
  if (terms.length === 0) return pool;
  return pool.filter((ref) => {
    const haystack = [
      ref.title,
      ref.authors.join(' '),
      ref.venue ?? '',
      ref.summary,
      ref.topics.join(' '),
      String(ref.year),
    ]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
