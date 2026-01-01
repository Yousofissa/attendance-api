import 'package:flutter/material.dart';
import 'api.dart';
import 'class_students_page.dart';

class ClassesPage extends StatefulWidget {
  const ClassesPage({super.key});

  @override
  State<ClassesPage> createState() => _ClassesPageState();
}

class _ClassesPageState extends State<ClassesPage> {
  List<dynamic> classes = [];
  bool loading = true;

  final List<Color> cardColors = const [
    Color(0xFFB3E5FC),
    Color(0xFFC8E6C9),
    Color(0xFFFFF9C4),
    Color(0xFFFFCCBC),
    Color(0xFFD1C4E9),
    Color(0xFFFFCDD2),
  ];

  @override
  void initState() {
    super.initState();
    loadClasses();
  }

  Future<void> loadClasses() async {
    setState(() => loading = true);
    classes = await Api.getClasses();
    setState(() => loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Classes"),
        actions: [
          IconButton(
            onPressed: loadClasses,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : classes.isEmpty
          ? const Center(child: Text("No classes found"))
          : SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            14,
            14,
            14,
            14 + MediaQuery.of(context).padding.bottom + 70,
          ),
          child: GridView.builder(
            physics: const NeverScrollableScrollPhysics(),
            itemCount: classes.length,
            gridDelegate:
            const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 2.1,
            ),
            itemBuilder: (context, i) {
              final c = classes[i];
              final color = cardColors[i % cardColors.length];

              return InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ClassStudentsPage(
                        classId: c["id"],
                        className: c["class_name"] ?? "Class",
                      ),
                    ),
                  );
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: color,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Padding(
                      padding:
                      const EdgeInsets.symmetric(horizontal: 10),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.school, size: 20),
                          const SizedBox(height: 6),
                          Text(
                            c["class_name"] ?? "",
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
