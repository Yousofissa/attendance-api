import 'package:flutter/material.dart';
import 'classes_page.dart';
import 'attendance_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Student Attendance',
      theme: ThemeData(useMaterial3: true),
      home: const HomeTabs(),
    );
  }
}

class HomeTabs extends StatefulWidget {
  const HomeTabs({super.key});

  @override
  State<HomeTabs> createState() => _HomeTabsState();
}

class _HomeTabsState extends State<HomeTabs> {
  int idx = 0;

  final List<Widget> pages = const [
    ClassesPage(),
    AttendancePage(),
  ];

  final List<Color> tabColors = const [
    Color(0xFF7E57C2),
    Color(0xFF26A69A),
  ];

  @override
  Widget build(BuildContext context) {
    final selectedColor = tabColors[idx];

    return Scaffold(
      body: pages[idx],
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          indicatorColor: selectedColor.withOpacity(0.25),
          labelTextStyle: MaterialStateProperty.resolveWith((states) {
            if (states.contains(MaterialState.selected)) {
              return TextStyle(
                color: selectedColor,
                fontWeight: FontWeight.w700,
              );
            }
            return const TextStyle(color: Colors.black54);
          }),
          iconTheme: MaterialStateProperty.resolveWith((states) {
            if (states.contains(MaterialState.selected)) {
              return IconThemeData(color: selectedColor);
            }
            return const IconThemeData(color: Colors.black45);
          }),
        ),
        child: NavigationBar(
          selectedIndex: idx,
          onDestinationSelected: (v) => setState(() => idx = v),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.class_),
              label: "Classes",
            ),
            NavigationDestination(
              icon: Icon(Icons.checklist),
              label: "Attendance",
            ),
          ],
        ),
      ),
    );
  }
}
